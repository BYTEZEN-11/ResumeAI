import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
} from "@/shared/utils/api-response";
export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    await db.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return successResponse(null, "All notifications marked as read");
  } catch (error) {
    return handleApiError(error);
  }
}
