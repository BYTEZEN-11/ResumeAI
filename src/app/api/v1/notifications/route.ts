import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
} from "@/shared/utils/api-response";
import { parsePagination } from "@/shared/utils/query-params";
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { searchParams } = req.nextUrl;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 50 });
    const where = {
      userId: session.user.id,
      ...(unreadOnly && { isRead: false }),
    };
    const [total, notifications, unreadCount] = await Promise.all([
      db.notification.count({ where }),
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);
    return successResponse(
      { notifications, unreadCount },
      "Notifications retrieved",
      {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPrevPage: page > 1,
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
