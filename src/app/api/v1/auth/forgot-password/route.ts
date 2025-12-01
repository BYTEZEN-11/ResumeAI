import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/modules/auth/schemas/auth.schema";
import { authService } from "@/modules/auth/services/auth.service";
import {
  successResponse,
  handleApiError,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { rateLimit } from "@/shared/utils/rate-limit";
import { ZodError } from "zod";
export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, { limit: 3, windowMs: 60_000 });
  if (!limit.success) {
    return errorResponse("Too many requests. Please try again later.", 429);
  }
  try {
    const body = await req.json();
    const validated = forgotPasswordSchema.parse(body);
    await authService.sendPasswordResetEmail(validated.email);

    return successResponse(
      null,
      "If an account exists with that email, a reset link has been sent."
    );
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
