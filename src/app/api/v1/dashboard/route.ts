import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { dashboardService } from "@/modules/dashboard/services/dashboard.service";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
} from "@/shared/utils/api-response";
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const [stats, scoreTrend, topMissingSkills, recentAnalyses] = await Promise.all([
      dashboardService.getStats(session.user.id),
      dashboardService.getScoreTrend(session.user.id, 30),
      dashboardService.getTopMissingSkills(session.user.id, 10),
      dashboardService.getRecentAnalyses(session.user.id, 5),
    ]);
    return successResponse(
      { stats, scoreTrend, topMissingSkills, recentAnalyses },
      "Dashboard data retrieved"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
