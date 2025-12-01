import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { resumeService } from "@/modules/resume/services/resume.service";
import { updateResumeSchema } from "@/modules/resume/schemas/resume.schema";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { createAuditLog } from "@/shared/utils/audit-log";
import { ZodError } from "zod";
type Params = { params: Promise<{ id: string }> };
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const resume = await resumeService.getResume(id, session.user.id);
    return successResponse(resume, "Resume retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateResumeSchema.parse(body);
    const resume = await resumeService.updateResume(id, session.user.id, validated);
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      resource: "Resume",
      resourceId: id,
      req,
    });
    return successResponse(resume, "Resume updated");
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
    await resumeService.deleteResume(id, session.user.id);
    await createAuditLog({
      userId: session.user.id,
      action: "DELETE",
      resource: "Resume",
      resourceId: id,
      req,
    });
    return successResponse(null, "Resume deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
