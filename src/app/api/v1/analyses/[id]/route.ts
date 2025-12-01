import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { analysisService } from "@/modules/analysis/services/analysis.service";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
} from "@/shared/utils/api-response";
type Params = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const analysis = await analysisService.getAnalysis(id, session.user.id);
    return successResponse(analysis, "Analysis retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    await analysisService.softDeleteAnalysis(id, session.user.id);
    return successResponse(null, "Analysis deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
