import { auth } from "@/auth";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/shared/utils/api-response";
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse("Unauthorized", 401);
  }
  try {

    const teamMember = await db.teamMember.findFirst({
      where: { userId: session.user.id },
      include: { team: true },
    });
    if (!teamMember) {
      return successResponse([]);
    }

    const teamMembers = await db.teamMember.findMany({
      where: { teamId: teamMember.teamId },
      select: { userId: true },
    });
    const userIds = teamMembers.map((m) => m.userId);

    const analyses = await db.resumeAnalysis.findMany({
      where: {
        userId: { in: userIds },
        deletedAt: null,
      },
      select: {
        id: true,
        jobTitle: true,
        company: true,
        atsScore: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return successResponse(analyses);
  } catch (error) {
    console.error("Team analyses error:", error);
    return errorResponse("Failed to fetch team analyses", 500);
  }
}
