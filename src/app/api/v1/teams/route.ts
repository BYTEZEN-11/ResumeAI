import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { createAuditLog } from "@/shared/utils/audit-log";
import { slugify } from "@/lib/utils";
import { ZodError } from "zod";
const createTeamSchema = z.object({
  name: z.string().min(2).max(80),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {

    const team = await db.team.findFirst({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
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
    return successResponse(team, team ? "Team retrieved" : "No team found");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {

    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
    });
    if (!subscription || subscription.plan !== "TEAM") {
      return errorResponse(
        "Team workspace requires an active Team plan. Please upgrade.",
        402
      );
    }

    const existing = await db.team.findFirst({
      where: { ownerId: session.user.id },
    });
    if (existing) {
      return errorResponse("You already own a team. Delete it first to create a new one.", 409);
    }
    const body = await req.json();
    const { name } = createTeamSchema.parse(body);

    const baseSlug = slugify(name);
    const count = await db.team.count({ where: { slug: { startsWith: baseSlug } } });
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;
    const team = await db.team.create({
      data: {
        name,
        slug,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: "TEAM_ADMIN",
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resource: "Team",
      resourceId: team.id,
      req,
    });
    return successResponse(team, "Team created", undefined, 201);
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
