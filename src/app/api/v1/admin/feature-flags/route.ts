import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { ZodError } from "zod";
function isAdmin(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
const createFlagSchema = z.object({
  key: z.string().min(1).regex(/^[a-z_]+$/, "Only lowercase letters and underscores"),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isEnabled: z.boolean().default(false),
  rolloutPct: z.number().min(0).max(100).default(0),
});
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  if (!isAdmin(session.user.role ?? "")) return forbiddenResponse();
  try {
    const flags = await db.featureFlag.findMany({ orderBy: { key: "asc" } });
    return successResponse(flags, "Feature flags retrieved");
  } catch (error) {
    return handleApiError(error);
  }
}
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  if (!isAdmin(session.user.role ?? "")) return forbiddenResponse();
  try {
    const body = await req.json();
    const validated = createFlagSchema.parse(body);
    const flag = await db.featureFlag.create({ data: validated });
    return successResponse(flag, "Feature flag created", undefined, 201);
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
