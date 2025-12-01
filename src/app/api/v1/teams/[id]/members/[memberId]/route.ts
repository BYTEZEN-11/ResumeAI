import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  notFoundResponse,
  errorResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { ZodError } from "zod";
import { UserRole } from "@prisma/client";
type Params = { params: Promise<{ id: string; memberId: string }> };
const updateRoleSchema = z.object({
  role: z.enum(["TEAM_MEMBER", "TEAM_ADMIN"]),
});
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id, memberId } = await params;
    const team = await db.team.findUnique({ where: { id } });
    if (!team) return notFoundResponse("Team");
    if (team.ownerId !== session.user.id) {
      return errorResponse("Only the team owner can change member roles", 403);
    }
    const member = await db.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== id) return notFoundResponse("Member");
    const body = await req.json();
    const { role } = updateRoleSchema.parse(body);
    if (member.userId === team.ownerId && role !== "TEAM_ADMIN") {
      return errorResponse(
        "Cannot demote the team owner. Transfer ownership first.",
        400
      );
    }
    await db.teamMember.update({
      where: { id: memberId },
      data: { role: role as UserRole },
    });
    return successResponse({ id: memberId, role }, "Member role updated");
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id, memberId } = await params;
    const team = await db.team.findUnique({ where: { id } });
    if (!team) return notFoundResponse("Team");
    const member = await db.teamMember.findUnique({ where: { id: memberId } });
    if (!member || member.teamId !== id) return notFoundResponse("Member");
    const isOwner = team.ownerId === session.user.id;
    const isSelf = member.userId === session.user.id;
    if (!isOwner && !isSelf) return errorResponse("Forbidden", 403);
    if (isSelf && isOwner) {
      return errorResponse(
        "You cannot remove yourself as the owner. Delete the team instead.",
        400
      );
    }
    await db.teamMember.delete({ where: { id: memberId } });
    return successResponse(null, isSelf ? "You have left the team" : "Member removed");
  } catch (error) {
    return handleApiError(error);
  }
}
