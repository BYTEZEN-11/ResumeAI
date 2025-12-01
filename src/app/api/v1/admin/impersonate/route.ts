import { NextRequest, NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAuditLog } from "@/shared/utils/audit-log";
import {
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  errorResponse,
  successResponse,
  handleApiError,
} from "@/shared/utils/api-response";
import { z } from "zod";
const IMPERSONATION_COOKIE = "rr_impersonate";
const IMPERSONATION_TTL_SECONDS = 60 * 60;

const IMPERSONATION_ISSUER = "resumerank:admin-impersonation";
const IMPERSONATION_AUDIENCE = "resumerank:impersonation-cookie";
function getImpersonationSecret(): Uint8Array {
  const secret = process.env.IMPERSONATION_SECRET;
  if (!secret) {
    throw new Error(
      "IMPERSONATION_SECRET environment variable is required."
    );
  }
  return new TextEncoder().encode(secret);
}
function isSuperAdmin(role: string) {
  return role === "SUPER_ADMIN";
}
function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  if (!isSuperAdmin(session.user.role ?? "")) {
    return forbiddenResponse();
  }
  try {
    const body = await req.json();
    const { userId } = z.object({ userId: z.string().cuid() }).parse(body);

    if (userId === session.user.id) {
      return errorResponse("You cannot impersonate yourself.", 400);
    }

    const target = await db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, email: true, role: true, isActive: true, isBanned: true },
    });
    if (!target) return notFoundResponse("User");
    if (!target.isActive || target.isBanned) {
      return errorResponse("Cannot impersonate a banned or inactive user.", 400);
    }

    if (isAdmin(target.role)) {
      return errorResponse("Cannot impersonate admin accounts.", 403);
    }
    await createAuditLog({
      userId: session.user.id,
      action: "ADMIN_ACTION",
      resource: "User",
      resourceId: userId,
      metadata: {
        action: "impersonate_start",
        targetEmail: target.email,
        targetName: target.name,
      },
      req,
    });

    const jwt = await new SignJWT({
      targetUserId: target.id,
      adminId: session.user.id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(IMPERSONATION_ISSUER)
      .setAudience(IMPERSONATION_AUDIENCE)
      .setJti(crypto.randomUUID())
      .setIssuedAt()
      .setExpirationTime(`${IMPERSONATION_TTL_SECONDS}s`)
      .sign(getImpersonationSecret());
    const res = NextResponse.json({
      success: true,
      message: `Now impersonating ${target.name ?? target.email}. Refresh the page.`,
      data: { targetId: target.id, targetName: target.name ?? target.email },
    });
    res.cookies.set(IMPERSONATION_COOKIE, jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: IMPERSONATION_TTL_SECONDS,
      path: "/",
    });
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {

    let adminId: string | undefined;
    try {
      const cookieValue = req.cookies.get(IMPERSONATION_COOKIE)?.value;
      if (cookieValue) {
        const { payload } = await jwtVerify(cookieValue, getImpersonationSecret(), {
          issuer: IMPERSONATION_ISSUER,
          audience: IMPERSONATION_AUDIENCE,
        });
        adminId = payload.adminId as string | undefined;
      }
    } catch {

    }
    await createAuditLog({
      userId: adminId ?? session.user.id,
      action: "ADMIN_ACTION",
      resource: "User",
      metadata: { action: "impersonate_end" },
      req,
    });
    const res = successResponse(null, "Impersonation ended. Refresh the page.");
    (res as NextResponse).cookies.set(IMPERSONATION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0,
      path: "/",
    });
    return res;
  } catch (error) {
    return handleApiError(error);
  }
}
