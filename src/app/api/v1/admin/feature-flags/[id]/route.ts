import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
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
const updateFlagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean().optional(),
  rolloutPct: z.number().min(0).max(100).optional(),
});
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  if (!isAdmin(session.user.role ?? "")) return forbiddenResponse();
  try {
    const { id } = await params;
    const flag = await db.featureFlag.findUnique({ where: { id } });
    if (!flag) return notFoundResponse("Feature flag");
    return successResponse(flag, "Feature flag retrieved");
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
    const existing = await db.featureFlag.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Feature flag");
    const body = await req.json();
    const validated = updateFlagSchema.parse(body);
    const flag = await db.featureFlag.update({
      where: { id },
      data: validated,
    });
    await createAuditLog({
      userId: session.user.id,
      action: "ADMIN_ACTION",
      resource: "FeatureFlag",
      resourceId: id,
      metadata: { changes: validated },
      req,
    });
    return successResponse(flag, "Feature flag updated");
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
    const existing = await db.featureFlag.findUnique({ where: { id } });
    if (!existing) return notFoundResponse("Feature flag");
    await db.featureFlag.delete({ where: { id } });
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "FeatureFlag",
      resourceId: id,
      req,
    });
    return successResponse(null, "Feature flag deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
