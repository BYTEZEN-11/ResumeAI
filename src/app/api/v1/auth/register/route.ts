import { NextRequest } from "next/server";
import { registerApiSchema } from "@/modules/auth/schemas/auth.schema";
import { authService } from "@/modules/auth/services/auth.service";
import { db } from "@/lib/db";
import {
  successResponse,
  handleApiError,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { rateLimit } from "@/shared/utils/rate-limit";
import { z } from "zod";
import { ZodError } from "zod";
const bodySchema = registerApiSchema.extend({
  referralCode: z.string().optional(),
});
export async function POST(req: NextRequest) {

  const limit = await rateLimit(req, { limit: 5, windowMs: 60_000 });
  if (!limit.success) {
    return errorResponse("Too many registration attempts. Please try again later.", 429);
  }
  try {
    const body = await req.json();
    const validated = bodySchema.parse(body);
    const user = await authService.register({
      name: validated.name,
      email: validated.email,
      password: validated.password,
    });

    if (validated.referralCode) {
      try {
        const referral = await db.referral.findUnique({
          where: { code: validated.referralCode },
        });
        if (
          referral &&
          referral.referrerId !== user.id &&
          referral.referredId === null
        ) {
          await db.$transaction(async (tx) => {
            await tx.referral.update({
              where: { id: referral.id },
              data: { referredId: user.id, status: "CONVERTED", convertedAt: new Date() },
            });
            await tx.subscription.update({
              where: { userId: user.id },
              data: { analysesLimit: { increment: referral.referredBonus } },
            });
            await tx.subscription.update({
              where: { userId: referral.referrerId },
              data: { analysesLimit: { increment: referral.referrerBonus } },
            });
            await tx.referral.update({
              where: { id: referral.id },
              data: { status: "REWARDED" },
            });
            await tx.notification.create({
              data: {
                userId: referral.referrerId,
                type: "SYSTEM",
                title: "Referral Bonus Earned!",
                message: `Someone signed up with your referral link. You've earned ${referral.referrerBonus} extra analyses!`,
                metadata: { bonus: referral.referrerBonus },
              },
            });
          });
        }
      } catch {

      }
    }
    return successResponse(
      { id: user.id, email: user.email, name: user.name },
      "Account created successfully",
      undefined,
      201
    );
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (process.env.NODE_ENV === "development") {
      console.error("[Register] Error details:", error);
    }
    return handleApiError(error);
  }
}
