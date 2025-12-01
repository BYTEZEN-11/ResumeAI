import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { ZodError } from "zod";
const MAX_API_KEYS = 10;
const createKeySchema = z.object({
  name: z.string().min(1).max(80),
  expiresIn: z
    .enum(["7d", "30d", "90d", "1y", "never"])
    .optional()
    .default("never"),

  permissions: z
    .array(
      z.string().min(1).max(64)
    )
    .max(8)
    .default([]),
});
function computeExpiry(expiresIn: string): Date | null {
  if (expiresIn === "never") return null;
  const now = Date.now();
  const map: Record<string, number> = {
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    "90d": 90 * 24 * 60 * 60 * 1000,
    "1y": 365 * 24 * 60 * 60 * 1000,
  };
  return new Date(now + map[expiresIn]);
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const keys = await db.apiKey.findMany({
      where: { userId: session.user.id, isActive: true },
      select: {
        id: true,
        name: true,
        prefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(keys, "API keys retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const body = await req.json();
    const validated = createKeySchema.parse(body);

    if (validated.permissions.includes("*")) {
      return errorResponse("The wildcard permission (*) cannot be self-issued.", 400);
    }

    const secret = crypto.randomBytes(32).toString("hex");
    const prefix = `rr_${crypto.randomBytes(4).toString("hex")}`;
    const rawKey = `${prefix}_${secret}`;

    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const expiresAt = computeExpiry(validated.expiresIn);

    const apiKey = await db.$transaction(async (tx) => {
      const activeCount = await tx.apiKey.count({
        where: { userId: session.user.id, isActive: true },
      });
      if (activeCount >= MAX_API_KEYS) {
        throw new Error("KEY_LIMIT_EXCEEDED");
      }
      return tx.apiKey.create({
        data: {
          userId: session.user.id,
          name: validated.name,
          keyHash,
          prefix,
          permissions: validated.permissions,
          expiresAt,
          isActive: true,
        },
      });
    });

    return successResponse(
      {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        permissions: apiKey.permissions,
        key: rawKey,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      "API key created. Copy it now — it will not be shown again.",
      undefined,
      201
    );
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof Error && error.message === "KEY_LIMIT_EXCEEDED") {
      return errorResponse(
        `You can have at most ${MAX_API_KEYS} active API keys. Revoke some to create new ones.`,
        400
      );
    }
    return handleApiError(error);
  }
}
