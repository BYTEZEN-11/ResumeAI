import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { createAuditLog } from "@/shared/utils/audit-log";
import { ZodError } from "zod";
type Params = { params: Promise<{ id: string }> };
function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  bannedReason: z.string().max(500).optional(),
  role: z.enum(["USER", "PRO", "TEAM_MEMBER", "TEAM_ADMIN", "ADMIN", "SUPER_ADMIN"]).optional(),
}).strict();
const adminOnlySchema = updateUserSchema.omit({ role: true });
const superAdminOnlySchema = updateUserSchema;
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  if (!isAdmin(session.user.role ?? "")) return forbiddenResponse();
  try {
    const { id } = await params;
    const user = await db.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isBanned: true,
        bannedAt: true,
        bannedReason: true,
        createdAt: true,
        lastLoginAt: true,
        subscription: {
          select: { plan: true, analysesUsed: true, analysesLimit: true, status: true },
        },
        _count: { select: { resumes: true, analyses: true } },
      },
    });
    if (!user) return notFoundResponse("User");
    return successResponse(user, "User retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  if (!isAdmin(session.user.role ?? "")) return forbiddenResponse();
  try {
    const { id } = await params;
    const existing = await db.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return notFoundResponse("User");
    if (
      existing.role === "SUPER_ADMIN" &&
      session.user.role !== "SUPER_ADMIN"
    ) {
      return forbiddenResponse();
    }
    const body = await req.json();
    const schemaToUse: z.ZodType<z.infer<typeof superAdminOnlySchema>> =
      session.user.role === "SUPER_ADMIN"
        ? superAdminOnlySchema
        : (adminOnlySchema as unknown as z.ZodType<z.infer<typeof superAdminOnlySchema>>);
    const validated = schemaToUse.parse(body);
    const updateData: Record<string, unknown> = {};
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;
    if ("role" in validated && validated.role !== undefined) updateData.role = validated.role as UserRole;
    if (validated.isBanned !== undefined) {
      updateData.isBanned = validated.isBanned;
      updateData.bannedAt = validated.isBanned ? new Date() : null;
      updateData.bannedReason = validated.isBanned ? (validated.bannedReason ?? "Banned by admin") : null;
    }
    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, isBanned: true, bannedReason: true,
      },
    });
    await createAuditLog({
      userId: session.user.id,
      action: "ADMIN_ACTION",
      resource: "User",
      resourceId: id,
      metadata: { action: "update_user", changes: validated },
      req,
    });
    return successResponse(user, "User updated");
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  if (!isAdmin(session.user.role ?? "")) return forbiddenResponse();
  try {
    const { id } = await params;
    if (id === session.user.id) {
      return forbiddenResponse();
    }
    const existing = await db.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) return notFoundResponse("User");
    if (existing.role === "SUPER_ADMIN") {
      return forbiddenResponse();
    }
    await db.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "User",
      resourceId: id,
      req,
    });
    return successResponse(null, "User deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
