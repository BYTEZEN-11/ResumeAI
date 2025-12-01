import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { resumeService } from "@/modules/resume/services/resume.service";
import { db } from "@/lib/db";
import { resumeFileSchema } from "@/modules/resume/schemas/resume.schema";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  errorResponse,
  notFoundResponse,
} from "@/shared/utils/api-response";
import { createAuditLog } from "@/shared/utils/audit-log";
import { ACCEPTED_MIME_TYPES, MAX_FILE_SIZE } from "@/constants";
type Params = { params: Promise<{ id: string }> };
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const existing = await db.resume.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return notFoundResponse("Resume");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return errorResponse("No file provided", 400);
    }
    try {
      resumeFileSchema.parse({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    } catch {
      return errorResponse(
        `Invalid file. Accepted types: ${ACCEPTED_MIME_TYPES.join(", ")}; max ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        400
      );
    }
    const resume = await resumeService.replaceResumeFile(id, session.user.id, file);
    await createAuditLog({
      userId: session.user.id,
      action: "UPLOAD",
      resource: "Resume",
      resourceId: id,
      metadata: { action: "replace_file", newFileName: file.name },
      req,
    });
    return successResponse(resume, "Resume file replaced successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
