import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import type { Session } from "next-auth";
export type AuthedKey = {
  userId: string;
  keyId: string;
  permissions: string[];
};
export const API_PERMISSIONS = {
  RESUMES_READ: "resumes:read",
  RESUMES_WRITE: "resumes:write",
  ANALYSES_READ: "analyses:read",
  ANALYSES_WRITE: "analyses:write",
  COVER_LETTERS_READ: "cover-letters:read",
  COVER_LETTERS_WRITE: "cover-letters:write",
} as const;
export type ApiPermission =
  (typeof API_PERMISSIONS)[keyof typeof API_PERMISSIONS];
export async function authenticateApiKey(
  authorizationHeader: string | null | undefined
): Promise<AuthedKey | null> {
  if (!authorizationHeader) return null;
  if (!authorizationHeader.startsWith("Bearer ")) return null;
  const plaintext = authorizationHeader.slice("Bearer ".length).trim();
  if (!plaintext) return null;

  const hash = createHash("sha256").update(plaintext).digest("hex");
  const record = await db.apiKey.findUnique({
    where: { keyHash: hash },
    select: {
      id: true,
      userId: true,
      permissions: true,
      isActive: true,
      expiresAt: true,
    },
  });
  if (!record) return null;
  if (!record.isActive) return null;
  if (record.expiresAt && record.expiresAt < new Date()) return null;

  db.apiKey
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return {
    userId: record.userId,
    keyId: record.id,
    permissions: record.permissions,
  };
}
export function hasPermission(key: AuthedKey, required: string): boolean {
  if (!key.permissions || key.permissions.length === 0) return false;

  if (key.permissions.includes("*")) return true;
  return key.permissions.includes(required);
}
export type AuthContext =
  | { kind: "session"; userId: string; session: Session }
  | { kind: "apiKey"; userId: string; keyId: string; permissions: string[] };
export async function resolveAuth(
  request: { headers: Headers }
): Promise<AuthContext | null> {
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const key = await authenticateApiKey(authHeader);
    if (key) {
      return {
        kind: "apiKey",
        userId: key.userId,
        keyId: key.keyId,
        permissions: key.permissions,
      };
    }

    return null;
  }
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    kind: "session",
    userId: session.user.id,
    session,
  };
}
export async function requireAuth(
  request: { headers: Headers },
  required?: ApiPermission
): Promise<{ ctx: AuthContext; ok: true } | { ok: false; reason: "unauth" | "forbidden" }> {
  const ctx = await resolveAuth(request);
  if (!ctx) return { ok: false, reason: "unauth" };
  if (required) {
    if (ctx.kind === "apiKey") {
      if (!hasPermission({ userId: ctx.userId, keyId: ctx.keyId, permissions: ctx.permissions }, required)) {
        return { ok: false, reason: "forbidden" };
      }
    }

  }
  return { ctx, ok: true };
}
