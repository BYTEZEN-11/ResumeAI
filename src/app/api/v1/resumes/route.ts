import { NextRequest } from "next/server";
import { resumeService } from "@/modules/resume/services/resume.service";
import { createResumeSchema, resumeQuerySchema } from "@/modules/resume/schemas/resume.schema";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { createAuditLog } from "@/shared/utils/audit-log";
import { ZodError } from "zod";
import { requireAuth, API_PERMISSIONS } from "@/modules/api-keys/services/api-key-auth";

export async function GET(req: NextRequest) {
  const authz = await requireAuth(req, API_PERMISSIONS.RESUMES_READ);
  if (!authz.ok) {
    return authz.reason === "forbidden" ? forbiddenResponse() : unauthorizedResponse();
  }
  const userId = authz.ctx.userId;
  try {

    const { searchParams } = req.nextUrl;
    const query = resumeQuerySchema.parse(
      Object.fromEntries(searchParams.entries())
    );
    const result = await resumeService.listResumes(userId, query);
    return successResponse(result.resumes, "Resumes retrieved", result.meta);
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  const authz = await requireAuth(req, API_PERMISSIONS.RESUMES_WRITE);
  if (!authz.ok) {
    return authz.reason === "forbidden" ? forbiddenResponse() : unauthorizedResponse();
  }
  const userId = authz.ctx.userId;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const tags = formData.getAll("tags") as string[];
    if (!file) {
      return handleApiError(new Error("No file provided"));
    }
    const validated = createResumeSchema.parse({ title, description, tags });
    const resume = await resumeService.uploadAndCreate(file, validated, userId);

    await createAuditLog({
      userId,
      action: "UPLOAD",
      resource: "Resume",
      resourceId: resume.id,
      metadata: { source: authz.ctx.kind },
      req,
    });
    return successResponse(resume, "Resume uploaded successfully", undefined, 201);
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
