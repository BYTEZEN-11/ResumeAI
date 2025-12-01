import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";
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
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 100 });
    const search = searchParams.get("search");
    const role = searchParams.get("role");
    const isActive = searchParams.get("isActive");
    const where = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
      ...(role && { role: role as UserRole }),
      ...(isActive !== null && isActive !== "" && { isActive: isActive === "true" }),
    };
    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          isBanned: true,
          createdAt: true,
          lastLoginAt: true,
          subscription: {
            select: { plan: true, analysesUsed: true, analysesLimit: true },
          },
          _count: {
            select: { resumes: true, analyses: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return successResponse(users, "Users retrieved", {
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
