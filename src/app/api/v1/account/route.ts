import { NextRequest } from "next/server";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { rateLimit } from "@/shared/utils/rate-limit";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";
const deleteSchema = z.object({
  confirmation: z.literal("DELETE MY ACCOUNT"),
  password: z.string().min(1, "Password is required"),
});

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const limit = await rateLimit(req, { limit: 5, windowMs: 60 * 60_000 });
  if (!limit.success) {
    return errorResponse("Too many deletion attempts. Try again in an hour.", 429);
  }
  try {
    const body = await req.json();
    const { confirmation, password } = deleteSchema.parse(body);
    if (confirmation !== "DELETE MY ACCOUNT") {
      return errorResponse("Type DELETE MY ACCOUNT to confirm.", 400);
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true, email: true },
    });
    if (!user || !user.passwordHash) {

      return errorResponse(
        "This account was created with a social login. Contact support to delete it.",
        400
      );
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return errorResponse("Incorrect password", 401);
    }
    const userId = session.user.id;

    await db.user.update({
      where: { id: userId },
      data: { tokenInvalidatedAt: new Date() },
    });

    await db.$transaction(async (tx) => {
      await tx.notification.deleteMany({ where: { userId } });
      await tx.apiKey.deleteMany({ where: { userId } });
      await tx.coverLetter.updateMany({
        where: { userId },
        data: { deletedAt: new Date() },
      });
      await tx.coverLetter.deleteMany({ where: { userId } });
      await tx.resumeAnalysis.updateMany({
        where: { userId },
        data: { deletedAt: new Date() },
      });
      await tx.resumeAnalysis.deleteMany({ where: { userId } });
      await tx.resume.deleteMany({ where: { userId } });
      await tx.jobDescription.deleteMany({ where: { userId } });
      await tx.payment.deleteMany({ where: { userId } });
      await tx.subscription.deleteMany({ where: { userId } });
      await tx.profile.deleteMany({ where: { userId } });

      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.teamMember.deleteMany({ where: { userId } });
      await tx.auditLog.deleteMany({ where: { userId } });

      await tx.referral.updateMany({
        where: { referredId: userId },
        data: { referredId: null, status: "PENDING" },
      });

      await tx.user.delete({ where: { id: userId } });
    });
    logger.info({ userId }, "User account deleted (GDPR erasure)");

    await signOut({ redirect: false });
    return successResponse(null, "Your account has been permanently deleted.");
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
