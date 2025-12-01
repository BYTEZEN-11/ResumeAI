import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { rateLimit } from "@/shared/utils/rate-limit";
import { createAuditLog } from "@/shared/utils/audit-log";
import { ZodError } from "zod";
const MAX_BULK = 10;
const schema = z.object({
  resumeId: z.string().cuid(),
  jobDescriptionIds: z
    .array(z.string().cuid())
    .min(2, "Select at least 2 job descriptions")
    .max(MAX_BULK, `Maximum ${MAX_BULK} analyses per bulk request`),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  const limit = await rateLimit(req, { limit: 3, windowMs: 60_000 });
  if (!limit.success) {
    return errorResponse("Too many bulk requests. Please wait a moment.", 429);
  }
  try {
    const body = await req.json();
    const validated = schema.parse(body);

    const resume = await db.resume.findFirst({
      where: { id: validated.resumeId, userId: session.user.id, deletedAt: null },
    });
    if (!resume) return errorResponse("Resume not found", 404);

    const jds = await db.jobDescription.findMany({
      where: {
        id: { in: validated.jobDescriptionIds },
        userId: session.user.id,
        deletedAt: null,
      },
      select: { id: true, title: true },
    });
    if (jds.length !== validated.jobDescriptionIds.length) {
      return errorResponse("One or more job descriptions not found or inaccessible", 404);
    }

    const bulkCount = jds.length;
    const { analyses } = await db.$transaction(async (tx) => {
      const sub = await tx.subscription.findUnique({
        where: { userId: session.user.id },
        select: { plan: true, analysesUsed: true, analysesLimit: true },
      });
      if (!sub) throw new Error("Subscription not found");
      const isUnlimited = sub.plan === "PRO" || sub.plan === "TEAM";
      const fitsFree = sub.analysesUsed + bulkCount <= sub.analysesLimit;
      if (!isUnlimited && !fitsFree) {
        const remaining = Math.max(0, sub.analysesLimit - sub.analysesUsed);
        throw new Error(
          `INSUFFICIENT_QUOTA:${remaining}`
        );
      }

      await tx.subscription.update({
        where: { userId: session.user.id },
        data: { analysesUsed: { increment: bulkCount } },
      });
      await tx.resumeAnalysis.createMany({
        data: jds.map((jd) => ({
          userId: session.user.id,
          resumeId: validated.resumeId,
          jobDescriptionId: jd.id,
          status: "PENDING" as const,
          jobTitle: jd.title,
        })),
      });
      const created = await tx.resumeAnalysis.findMany({
        where: {
          userId: session.user.id,
          resumeId: validated.resumeId,
          status: "PENDING",
          jobTitle: { in: jds.map((jd) => jd.title) },
        },
        select: { id: true, jobDescriptionId: true, jobTitle: true },
        orderBy: { createdAt: "desc" },
        take: bulkCount,
      });
      return { analyses: created };
    });
    if (analyses.length !== bulkCount) {

      await db.subscription.update({
        where: { userId: session.user.id },
        data: { analysesUsed: { decrement: bulkCount } },
      });
      return errorResponse("Failed to create analysis records", 500);
    }

    try {
      await inngest.send(
        analyses.map((a) => ({
          name: "analysis/requested" as const,
          data: {
            analysisId: a.id,
            userId: session.user.id,
            resumeId: validated.resumeId,
            jobDescriptionId: a.jobDescriptionId,
          },
        }))
      );
    } catch (err) {
      console.error("[Bulk] inngest.send failed, refunding quota", err);
      await db.subscription.updateMany({
        where: { userId: session.user.id, analysesUsed: { gte: bulkCount } },
        data: { analysesUsed: { decrement: bulkCount } },
      });

      await db.resumeAnalysis.deleteMany({
        where: { id: { in: analyses.map((a) => a.id) } },
      });
      return errorResponse("Failed to queue analyses. Please try again.", 503);
    }

    await db.notification.create({
      data: {
        userId: session.user.id,
        type: "SYSTEM",
        title: "Bulk Analysis Started",
        message: `${analyses.length} analyses queued for "${resume.title}". You'll be notified as each one completes.`,
        metadata: { count: analyses.length, resumeId: validated.resumeId },
      },
    });
    await createAuditLog({
      userId: session.user.id,
      action: "ANALYZE",
      resource: "ResumeAnalysis",
      metadata: { bulk: true, count: analyses.length, resumeId: validated.resumeId },
      req,
    });
    return successResponse(
      {
        queued: analyses.length,
        analysisIds: analyses.map((a) => a.id),
        resumeTitle: resume.title,
      },
      `${analyses.length} analyses queued successfully`,
      undefined,
      202
    );
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_QUOTA:")) {
      const remaining = error.message.split(":")[1];
      return errorResponse(
        `You only have ${remaining} analyses remaining this month. Reduce your selection or upgrade to Pro.`,
        402
      );
    }
    if (error instanceof Error && error.message === "Subscription not found") {
      return errorResponse("Subscription not found", 404);
    }
    return handleApiError(error);
  }
}
