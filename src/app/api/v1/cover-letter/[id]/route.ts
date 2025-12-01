import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  notFoundResponse,
} from "@/shared/utils/api-response";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const letter = await db.coverLetter.findFirst({
      where: { id, userId: session.user.id, deletedAt: null },
      select: {
        id: true,
        tone: true,
        customNote: true,
        body: true,
        wordCount: true,
        createdAt: true,
        updatedAt: true,
        jobDescription: { select: { id: true, title: true, company: true } },
        resume: { select: { id: true, title: true } },
      },
    });
    if (!letter) return notFoundResponse("Cover letter not found");
    return successResponse(letter, "Cover letter retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const result = await db.coverLetter.updateMany({
      where: { id, userId: session.user.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) return notFoundResponse("Cover letter not found");
    return successResponse({ id }, "Cover letter deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
