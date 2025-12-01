import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { analysisService } from "@/modules/analysis/services/analysis.service";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { rateLimit } from "@/shared/utils/rate-limit";
import { createAuditLog } from "@/shared/utils/audit-log";
import { ZodError } from "zod";
const createAnalysisSchema = z.object({
  resumeId: z.string().cuid(),
  jobDescriptionId: z.string().cuid(),
});
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(10),
  search: z.string().optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { searchParams } = req.nextUrl;
    const query = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const result = await analysisService.listAnalyses({
      userId: session.user.id,
      ...query,
    });
    return successResponse(result.analyses, "Analyses retrieved", result.meta);
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const limit = await rateLimit(req, { limit: 10, windowMs: 60_000 });
  if (!limit.success) {
    return errorResponse("Too many analysis requests. Please wait a moment.", 429);
  }
  try {
    const body = await req.json();
    const validated = createAnalysisSchema.parse(body);
    const analysis = await analysisService.createAnalysis({
      userId: session.user.id,
      resumeId: validated.resumeId,
      jobDescriptionId: validated.jobDescriptionId,
    });
    await createAuditLog({
      userId: session.user.id,
      action: "ANALYZE",
      resource: "ResumeAnalysis",
      resourceId: analysis.id,
      req,
    });
    return successResponse(analysis, "Analysis queued", undefined, 202);
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
