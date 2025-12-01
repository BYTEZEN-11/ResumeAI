import { db } from "@/lib/db";
import crypto from "crypto";
import type { WebhookEvent } from "@prisma/client";
import { logger } from "@/lib/logger";
import { safeFetch } from "@/lib/ssrf-guard";
const MAX_WEBHOOKS = 10;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [60, 300, 900];

function getEncryptionKey(): Buffer {
  const raw = process.env.WEBHOOK_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "WEBHOOK_ENCRYPTION_KEY is required to encrypt webhook secrets."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "WEBHOOK_ENCRYPTION_KEY must be a 32-byte key (base64-encoded). Generate with: openssl rand -base64 32"
    );
  }
  return key;
}
function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}
function decryptSecret(blob: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(blob, "base64");
  if (buf.length < 12 + 16 + 1) {
    throw new Error("Encrypted webhook secret blob is malformed.");
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf-8");
}
export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
};

export type CreatedWebhook = {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  createdAt: Date;
};
export class WebhookService {

  async createWebhook(
    userId: string,
    data: { name: string; url: string; events: WebhookEvent[] }
  ): Promise<CreatedWebhook> {

    return db.$transaction(async (tx) => {
      const count = await tx.webhook.count({ where: { userId, isActive: true } });
      if (count >= MAX_WEBHOOKS) {
        throw new Error(`Maximum ${MAX_WEBHOOKS} webhooks allowed.`);
      }

      const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
      const secretEncrypted = encryptSecret(secret);
      const created = await tx.webhook.create({
        data: {
          userId,
          name: data.name,
          url: data.url,
          secret: secretEncrypted,
          events: data.events,
          isActive: true,
        },
      });
      return {
        id: created.id,
        name: created.name,
        url: created.url,
        events: created.events,
        secret,
        createdAt: created.createdAt,
      };
    });
  }
  async listWebhooks(userId: string) {
    return db.webhook.findMany({
      where: { userId, isActive: true },
      include: {
        _count: { select: { deliveries: true } },
        deliveries: {
          orderBy: { attemptedAt: "desc" },
          take: 1,
          select: { success: true, statusCode: true, attemptedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
  async deleteWebhook(id: string, userId: string) {
    const hook = await db.webhook.findFirst({ where: { id, userId } });
    if (!hook) throw new Error("Webhook not found");

    await db.webhook.update({ where: { id }, data: { isActive: false } });
  }
  async getDeliveries(webhookId: string, userId: string) {
    const hook = await db.webhook.findFirst({ where: { id: webhookId, userId } });
    if (!hook) throw new Error("Webhook not found");
    return db.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { attemptedAt: "desc" },
      take: 50,
    });
  }

  async dispatchEvent(
    userId: string,
    event: WebhookEvent,
    data: Record<string, unknown>
  ): Promise<void> {
    const hooks = await db.webhook.findMany({
      where: {
        userId,
        isActive: true,
        events: { has: event },
      },
    });
    if (hooks.length === 0) return;
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    await Promise.allSettled(hooks.map((hook) => this.deliver(hook, payload)));
  }
  private async deliver(
    hook: { id: string; url: string; secret: string },
    payload: WebhookPayload,
    retryCount = 0
  ): Promise<void> {

    let plaintextSecret: string;
    try {
      plaintextSecret = decryptSecret(hook.secret);
    } catch (err) {
      logger.error(
        { webhookId: hook.id, err: err instanceof Error ? err.message : String(err) },
        "Failed to decrypt webhook secret; disabling webhook"
      );
      await db.webhook.update({ where: { id: hook.id }, data: { isActive: false } });
      return;
    }
    const body = JSON.stringify(payload);
    const signature = this.sign(body, plaintextSecret);
    const startTime = Date.now();
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let success = false;
    try {

      const res = await safeFetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ResumeRank-Signature": signature,
          "X-ResumeRank-Event": payload.event,
          "X-ResumeRank-Timestamp": payload.timestamp,
          "X-ResumeRank-Retry-Count": retryCount.toString(),
          "User-Agent": "ResumeRankWebhook/1.0",
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      statusCode = res.status;
      responseBody = (await res.text()).substring(0, 500);
      success = res.ok;
    } catch (err) {
      responseBody = err instanceof Error ? err.message : "Delivery failed";
      logger.error(
        { webhookId: hook.id, url: hook.url, error: responseBody, retryCount },
        "Webhook delivery failed"
      );
    }
    const duration = Date.now() - startTime;

    const shouldRetry = !success && retryCount < MAX_RETRIES;
    const nextRetryAt = shouldRetry
      ? new Date(Date.now() + RETRY_DELAYS[retryCount] * 1000)
      : null;

    const delivery = await db.webhookDelivery.create({
      data: {
        webhookId: hook.id,
        event: payload.event,
        payload: payload as unknown as import("@prisma/client").Prisma.InputJsonValue,
        statusCode,
        responseBody,
        success,
        duration,
        retryCount,
        nextRetryAt,
      },
    });

    await db.webhook.update({
      where: { id: hook.id },
      data: {
        lastFiredAt: new Date(),
        failCount: success ? 0 : { increment: 1 },
      },
    });

    if (success) {
      logger.info(
        { webhookId: hook.id, deliveryId: delivery.id, statusCode, duration },
        "Webhook delivered successfully"
      );
    } else if (shouldRetry) {
      logger.warn(
        { webhookId: hook.id, deliveryId: delivery.id, retryCount, nextRetryAt },
        "Webhook delivery failed, will retry"
      );
    } else {
      logger.error(
        { webhookId: hook.id, deliveryId: delivery.id, retryCount },
        "Webhook delivery failed after all retries"
      );
    }

    if (!success) {
      const hook2 = await db.webhook.findUnique({
        where: { id: hook.id },
        select: { failCount: true },
      });
      if ((hook2?.failCount ?? 0) >= 10) {
        await db.webhook.update({
          where: { id: hook.id },
          data: { isActive: false },
        });
        logger.warn(
          { webhookId: hook.id },
          "Webhook auto-disabled after 10 consecutive failures"
        );
      }
    }
  }

  sign(body: string, secret: string): string {
    return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  }

  async processRetries(): Promise<void> {
    const now = new Date();

    const pendingRetries = await db.webhookDelivery.findMany({
      where: {
        success: false,
        nextRetryAt: { lte: now },
        retryCount: { lt: MAX_RETRIES },
      },
      include: {
        webhook: {
          select: { id: true, url: true, secret: true, isActive: true },
        },
      },
      take: 50,
    });
    if (pendingRetries.length === 0) {
      logger.info("No pending webhook retries");
      return;
    }
    logger.info(`Processing ${pendingRetries.length} webhook retries`);

    await db.webhookDelivery.updateMany({
      where: {
        id: { in: pendingRetries.map((d) => d.id) },
      },
      data: { nextRetryAt: null },
    });

    const results = await Promise.allSettled(
      pendingRetries.map(async (delivery) => {

        if (!delivery.webhook.isActive) {
          logger.info(
            { webhookId: delivery.webhookId },
            "Skipping retry for disabled webhook"
          );
          return;
        }
        const payload = delivery.payload as unknown as WebhookPayload;
        await this.deliver(
          {
            id: delivery.webhook.id,
            url: delivery.webhook.url,
            secret: delivery.webhook.secret,
          },
          payload,
          delivery.retryCount + 1
        );
      })
    );
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    logger.info(
      { total: pendingRetries.length, successful, failed },
      "Webhook retry batch complete"
    );
  }
}
export const webhookService = new WebhookService();
