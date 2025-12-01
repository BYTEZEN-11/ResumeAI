import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { AuditAction } from "@prisma/client";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/shared/utils/api-response";
import { parsePagination } from "@/shared/utils/query-params";
function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  if (!isAdmin(session.user.role ?? "")) return forbiddenResponse();
  try {
    const { searchParams } = req.nextUrl;
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 50, maxPageSize: 200 });
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");
    const where = {
      ...(userId && { userId }),
      ...(action && { action: action as AuditAction }),
      ...(resource && { resource }),
    };
    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return successResponse(logs, "Audit logs retrieved", {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: page * pageSize < total,
      hasPrevPage: page > 1,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
