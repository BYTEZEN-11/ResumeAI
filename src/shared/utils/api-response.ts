import { NextResponse } from "next/server";
import type { ApiResponse, PaginationMeta, ValidationError } from "@/types";
import { ZodError } from "zod";
export function successResponse<T>(
  data: T,
  message = "Success",
  meta?: PaginationMeta,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data, meta }, { status });
}
export function errorResponse(
  message: string,
  status = 400,
  errors?: ValidationError[]
): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, message, data: null, errors },
    { status }
  );
}
export function unauthorizedResponse(): NextResponse<ApiResponse> {
  return errorResponse("Unauthorized", 401);
}
export function forbiddenResponse(): NextResponse<ApiResponse> {
  return errorResponse("Forbidden", 403);
}
export function notFoundResponse(resource = "Resource"): NextResponse<ApiResponse> {
  return errorResponse(`${resource} not found`, 404);
}
export function validationErrorResponse(error: ZodError): NextResponse<ApiResponse> {
  const errors: ValidationError[] = error.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
  return NextResponse.json(
    { success: false, message: "Validation failed", data: null, errors },
    { status: 422 }
  );
}
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error("[API Error]", error);
  if (error instanceof ZodError) {
    return validationErrorResponse(error);
  }
  if (error instanceof Error) {
    const msg = error.message;

    if (
      msg.includes("connect ECONNREFUSED") ||
      msg.includes("Can't reach database") ||
      msg.includes("Connection refused") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("P1001") ||
      msg.includes("P1003") ||
      msg.includes("P2024")
    ) {

      let dbHint = "the database";
      try {
        const dbUrl = process.env.DATABASE_URL;
        if (dbUrl) {
          const u = new URL(dbUrl);
          dbHint = `${u.hostname}:${u.port || "5432"}`;
        }
      } catch {

      }
      return errorResponse(
        `Database unavailable (${dbHint}). Please try again shortly.`,
        503
      );
    }

    if (msg.includes("not found")) return notFoundResponse();
    if (msg.includes("Unauthorized") || msg.includes("Access denied")) {
      return unauthorizedResponse();
    }
    if (msg.includes("limit") || msg.includes("upgrade")) {
      return errorResponse(msg, 402);
    }
    return errorResponse(msg, 400);
  }
  return errorResponse("Internal server error", 500);
}
