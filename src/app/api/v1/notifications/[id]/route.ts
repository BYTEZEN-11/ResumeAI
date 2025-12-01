import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  notFoundResponse,
} from "@/shared/utils/api-response";
type Params = { params: Promise<{ id: string }> };
export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const notification = await db.notification.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!notification) return notFoundResponse("Notification");
    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return successResponse(updated, "Notification marked as read");
  } catch (error) {
    return handleApiError(error);
  }
}
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { id } = await params;
    const notification = await db.notification.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!notification) return notFoundResponse("Notification");
    await db.notification.delete({ where: { id } });
    return successResponse(null, "Notification deleted");
  } catch (error) {
    return handleApiError(error);
  }
}
