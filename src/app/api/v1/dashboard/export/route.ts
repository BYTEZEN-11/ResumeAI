import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { dashboardService } from "@/modules/dashboard/services/dashboard.service";
import { unauthorizedResponse, handleApiError } from "@/shared/utils/api-response";
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const csv = await dashboardService.exportAnalysesAsCsv(session.user.id);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="resume-analyses-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
