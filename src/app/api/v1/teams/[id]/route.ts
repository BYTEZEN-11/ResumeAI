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
const updateTeamSchema = z.object({
  name: z.string().min(2).max(80).optional(),
});
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const team = await db.team.findUnique({ where: { id } });
    if (!team) return notFoundResponse("Team");
    if (team.ownerId !== session.user.id) return forbiddenResponse();
    const body = await req.json();
    const validated = updateTeamSchema.parse(body);
    const updated = await db.team.update({
      where: { id },
      data: validated,
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
      },
    });
    return successResponse(updated, "Team updated");
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const team = await db.team.findUnique({ where: { id } });
    if (!team) return notFoundResponse("Team");
    if (team.ownerId !== session.user.id) return forbiddenResponse();
    await db.team.delete({ where: { id } });
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "Team",
      resourceId: id,
      req,
    });
    return successResponse(null, "Team deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
