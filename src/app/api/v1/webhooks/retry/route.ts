import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { webhookService } from "@/modules/webhooks/services/webhook.service";
import { successResponse, handleApiError, errorResponse } from "@/shared/utils/api-response";
import { logger } from "@/lib/logger";
export async function POST(req: NextRequest) {
  try {

    const authHeader = req.headers.get("authorization");
    const expectedSecret = process.env.WEBHOOK_RETRY_SECRET;
    if (!expectedSecret) {
      logger.error("WEBHOOK_RETRY_SECRET not configured");
      return errorResponse("Retry endpoint not configured", 500);
    }
    const expected = `Bearer ${expectedSecret}`;
    const provided = authHeader ?? "";

    const a = Buffer.from(expected, "utf-8");
    const b = Buffer.from(provided, "utf-8");
    const authOk =
      a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!authOk) {
      logger.warn(
        { ip: req.headers.get("x-forwarded-for") || "unknown" },
        "Unauthorized webhook retry attempt"
      );
      return errorResponse("Unauthorized", 401);
    }
    logger.info("Starting webhook retry processing");
    await webhookService.processRetries();
    return successResponse(null, "Webhook retries processed");
  } catch (error) {
    logger.error({ error }, "Error processing webhook retries");
    return handleApiError(error);
  }
}
