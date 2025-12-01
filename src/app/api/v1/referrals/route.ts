import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { APP_URL } from "@/constants";
import crypto from "crypto";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { rateLimit } from "@/shared/utils/rate-limit";
const REFERRER_BONUS = 3;
const REFERRED_BONUS = 2;

const REFERRAL_CODE_BYTES = 16;

async function generateUniqueReferralCode(): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = crypto.randomBytes(REFERRAL_CODE_BYTES).toString("hex");
    const existing = await db.referral.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const limit = await rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (!limit.success) {
    return errorResponse("Too many requests. Please try again later.", 429);
  }
  try {

    let referral = await db.referral.findFirst({
      where: { referrerId: session.user.id, referredId: null, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!referral) {
      const code = await generateUniqueReferralCode();
      if (!code) {
        return errorResponse("Could not generate a unique referral code. Please try again.", 500);
      }
      referral = await db.referral.create({
        data: {
          referrerId: session.user.id,
          code,
          status: "PENDING",
          referrerBonus: REFERRER_BONUS,
          referredBonus: REFERRED_BONUS,
        },
      });
    }

    const [totalReferrals, converted, totalBonusEarned] = await Promise.all([
      db.referral.count({ where: { referrerId: session.user.id } }),
      db.referral.count({
        where: { referrerId: session.user.id, status: { in: ["CONVERTED", "REWARDED"] } },
      }),
      db.referral.aggregate({
        where: { referrerId: session.user.id, status: "REWARDED" },
        _sum: { referrerBonus: true },
      }),
    ]);
    return successResponse(
      {
        code: referral.code,
        referralUrl: `${APP_URL}/auth/signup?ref=${referral.code}`,
        totalReferrals,
        converted,
        totalBonusEarned: totalBonusEarned._sum.referrerBonus ?? 0,
        referrerBonus: REFERRER_BONUS,
        referredBonus: REFERRED_BONUS,
      },
      "Referral info retrieved"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
