import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";
import type { NextRequest } from "next/server";
const AUDIT_DENY_KEYS = new Set([
  "password",
  "passwordhash",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "session",
  "set-cookie",
]);

function sanitizeAuditMetadata(
  input: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    const lower = k.toLowerCase();
    if (AUDIT_DENY_KEYS.has(lower)) {
      out[k] = "[REDACTED]";
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = sanitizeAuditMetadata(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}
export async function createAuditLog(data: {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  req?: NextRequest;
}): Promise<void> {
  try {
    const ipAddress = data.req?.headers.get("x-forwarded-for")?.split(",")[0] ?? null;
    const userAgent = data.req?.headers.get("user-agent") ?? null;

    let metadata: Record<string, unknown> | undefined;
    if (data.metadata) {
      metadata = sanitizeAuditMetadata(data.metadata);
      const serialized = JSON.stringify(metadata);
      if (serialized.length > 4096) {
        metadata = {
          _truncated: true,
          _size: serialized.length,
        };
      }
    }
    await db.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,

        metadata: metadata as
          | import("@prisma/client").Prisma.InputJsonValue
          | undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch {

    const { logger } = await import("@/lib/logger");
    logger.error(
      {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
      },
      "Failed to create audit log"
    );
  }
}
