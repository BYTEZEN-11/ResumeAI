import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  errorResponse,
  validationErrorResponse,
} from "@/shared/utils/api-response";
import { rateLimit } from "@/shared/utils/rate-limit";
import { ZodError } from "zod";
const schema = z.object({ code: z.string().min(1).max(128) });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const limit = await rateLimit(req, { limit: 10, windowMs: 60_000 });
  if (!limit.success) {
    return errorResponse("Too many attempts. Please try again later.", 429);
  }
  try {
    const body = await req.json();
    const { code } = schema.parse(body);

    const alreadyReferred = await db.referral.findFirst({
      where: { referredId: session.user.id },
    });
    if (alreadyReferred) {
      return errorResponse("You have already applied a referral code.", 409);
    }

    const referral = await db.referral.findUnique({ where: { code } });
    if (!referral) return errorResponse("Invalid referral code.", 404);
    if (referral.referrerId === session.user.id) {
      return errorResponse("You cannot use your own referral code.", 400);
    }
    if (referral.referredId !== null) {
      return errorResponse("This referral code has already been used.", 409);
    }

    await db.$transaction(async (tx) => {

      await tx.referral.update({
        where: { id: referral.id },
        data: {
          referredId: session.user.id,
          status: "CONVERTED",
          convertedAt: new Date(),
        },
      });

      await tx.subscription.update({
        where: { userId: session.user.id },
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

      await tx.notification.create({
        data: {
          userId: session.user.id,
          type: "SYSTEM",
          title: "Referral Bonus Applied!",
          message: `Welcome bonus: ${referral.referredBonus} extra analyses have been added to your account.`,
          metadata: { bonus: referral.referredBonus },
        },
      });
    });
    return successResponse(
      { bonusEarned: referral.referredBonus },
      `Referral applied! You've received ${referral.referredBonus} bonus analyses.`
    );
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
