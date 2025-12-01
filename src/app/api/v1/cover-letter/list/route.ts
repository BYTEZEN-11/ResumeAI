import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
} from "@/shared/utils/api-response";
import { parsePagination } from "@/shared/utils/query-params";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const url = new URL(req.url);
    const { searchParams } = url;
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 50 });
    const where = { userId: session.user.id, deletedAt: null };
    const [total, letters] = await Promise.all([
      db.coverLetter.count({ where }),
      db.coverLetter.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          tone: true,
          wordCount: true,
          createdAt: true,
          jobDescription: { select: { title: true, company: true } },
          resume: { select: { title: true } },
        },
      }),
    ]);
    return successResponse(
      { coverLetters: letters },
      "Cover letters retrieved",
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
