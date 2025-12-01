import { NextRequest } from "next/server";
import { z } from "zod";
import { authService } from "@/modules/auth/services/auth.service";
import {
  successResponse,
  handleApiError,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { rateLimit, addRateLimitHeaders } from "@/shared/utils/rate-limit";
import { getRequestIdFromReq } from "@/shared/utils/request-id";
import { loggerWithRequestId } from "@/lib/logger";
import { ZodError } from "zod";
const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number")
    .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
});
export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromReq(req);
  const log = loggerWithRequestId(requestId);

  const limit = await rateLimit(req, { limit: 5, windowMs: 60_000 });
  if (!limit.success) {
    log.warn("Rate limit exceeded for password reset");
    const response = errorResponse("Too many attempts. Please try again later.", 429);
    return addRateLimitHeaders(response, limit);
  }
  try {
    const body = await req.json();
    const validated = resetPasswordSchema.parse(body);
    log.info({ email: validated.email }, "Processing password reset");
    await authService.resetPassword(
      validated.email,
      validated.token,
      validated.password
    );
    log.info({ email: validated.email }, "Password reset successful");
    const response = successResponse(null, "Password reset successfully. You can now sign in.");
    return addRateLimitHeaders(response, limit);
  } catch (error) {
    log.error({ error }, "Password reset error");
    if (error instanceof ZodError) {
      const response = validationErrorResponse(error);
      return addRateLimitHeaders(response, limit);
    }
    const response = handleApiError(error);
    return addRateLimitHeaders(response, limit);
  }
}
