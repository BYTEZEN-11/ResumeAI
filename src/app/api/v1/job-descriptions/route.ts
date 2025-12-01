import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { parsePagination } from "@/shared/utils/query-params";
import { ZodError } from "zod";
const createJobDescSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().max(200).optional(),
  description: z.string().min(50, "Job description must be at least 50 characters").max(50000),
  url: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string()).max(10).optional().default([]),
});
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const { searchParams } = req.nextUrl;
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 10, maxPageSize: 50 });
    const search = searchParams.get("search");
    const where = {
      userId: session.user.id,
      deletedAt: null,
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };
    const [total, items] = await Promise.all([
      db.jobDescription.count({ where }),
      db.jobDescription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return successResponse(items, "Job descriptions retrieved", {
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
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const body = await req.json();
    const validated = createJobDescSchema.parse(body);
    const jd = await db.jobDescription.create({
      data: {
        userId: session.user.id,
        title: validated.title,
        company: validated.company,
        description: validated.description,
        url: validated.url || null,
        tags: validated.tags,
      },
    });
    return successResponse(jd, "Job description created", undefined, 201);
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
