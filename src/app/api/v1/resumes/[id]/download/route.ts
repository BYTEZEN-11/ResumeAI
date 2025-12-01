import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { storageService } from "@/modules/resume/services/storage.service";
import {
  errorResponse,
  handleApiError,
  notFoundResponse,
  unauthorizedResponse,
} from "@/shared/utils/api-response";
import { createAuditLog } from "@/shared/utils/audit-log";
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const resume = await db.resume.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
      select: { id: true, storagePath: true },
    });
    if (!resume) return notFoundResponse("Resume");
    if (!resume.storagePath) {
      return errorResponse("Resume file is unavailable.", 410);
    }
    const signedUrl = await storageService.getSignedUrl(resume.storagePath, 60);
    await createAuditLog({
      userId: session.user.id,
      action: "READ",
      resource: "Resume",
      resourceId: resume.id,
    });
    return Response.json({ url: signedUrl, expiresIn: 60 });
  } catch (error) {
    return handleApiError(error);
  }
}
