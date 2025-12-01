import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  handleApiError,
  unauthorizedResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { rateLimit } from "@/shared/utils/rate-limit";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const limit = await rateLimit(req, { limit: 3, windowMs: 60 * 60_000 });
  if (!limit.success) {
    return errorResponse("Too many export requests. Try again in an hour.", 429);
  }
  try {
    const userId = session.user.id;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {

        controller.enqueue(encoder.encode('{"generatedAt":'));
        controller.enqueue(
          encoder.encode(JSON.stringify(new Date().toISOString()))
        );
        controller.enqueue(encoder.encode(',"schemaVersion":1'));

        const user = await db.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            createdAt: true,
            lastLoginAt: true,
          },
        });
        controller.enqueue(encoder.encode(',"user":'));
        controller.enqueue(encoder.encode(JSON.stringify(user)));
        const profile = await db.profile.findUnique({ where: { userId } });
        controller.enqueue(encoder.encode(',"profile":'));
        controller.enqueue(encoder.encode(JSON.stringify(profile)));
        const subscription = await db.subscription.findUnique({
          where: { userId },
          select: {
            plan: true,
            status: true,
            analysesUsed: true,
            analysesLimit: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            createdAt: true,
          },
        });
        controller.enqueue(encoder.encode(',"subscription":'));
        controller.enqueue(encoder.encode(JSON.stringify(subscription)));

        await streamCollection(
          controller,
          encoder,
          "resumes",
          (skip) =>
            db.resume.findMany({
              where: { userId, deletedAt: null },
              select: {
                id: true,
                title: true,
                description: true,
                fileName: true,
                fileType: true,
                version: true,
                tags: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
              skip,
              take: 500,
            })
        );
        await streamCollection(
          controller,
          encoder,
          "jobDescriptions",
          (skip) =>
            db.jobDescription.findMany({
              where: { userId, deletedAt: null },
              select: {
                id: true,
                title: true,
                company: true,
                description: true,
                url: true,
                tags: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
              skip,
              take: 500,
            })
        );
        await streamCollection(
          controller,
          encoder,
          "analyses",
          (skip) =>
            db.resumeAnalysis.findMany({
              where: { userId, deletedAt: null },
              select: {
                id: true,
                jobTitle: true,
                company: true,
                atsScore: true,
                resumeScore: true,
                skillMatchPct: true,
                status: true,
                createdAt: true,
                completedAt: true,
                atsBreakdown: true,
                matchedSkills: true,
                missingSkills: true,
                recommendations: true,
              },
              orderBy: { createdAt: "asc" },
              skip,
              take: 500,
            })
        );
        await streamCollection(
          controller,
          encoder,
          "coverLetters",
          (skip) =>
            db.coverLetter.findMany({
              where: { userId, deletedAt: null },
              select: {
                id: true,
                tone: true,
                body: true,
                wordCount: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
              skip,
              take: 500,
            })
        );
        await streamCollection(
          controller,
          encoder,
          "notifications",
          (skip) =>
            db.notification.findMany({
              where: { userId },
              select: {
                id: true,
                type: true,
                title: true,
                message: true,
                isRead: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
              skip,
              take: 500,
            })
        );
        await streamCollection(
          controller,
          encoder,
          "payments",
          (skip) =>
            db.payment.findMany({
              where: { userId },
              select: {
                id: true,
                amount: true,
                currency: true,
                status: true,
                createdAt: true,
              },
              orderBy: { createdAt: "asc" },
              skip,
              take: 500,
            })
        );

        const apiKeys = await db.apiKey.findMany({
          where: { userId, isActive: true },
          select: {
            id: true,
            name: true,
            prefix: true,
            permissions: true,
            lastUsedAt: true,
            createdAt: true,

          },
        });
        controller.enqueue(encoder.encode(',"apiKeys":'));
        controller.enqueue(encoder.encode(JSON.stringify(apiKeys)));
        const webhooks = await db.webhook.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            url: true,
            events: true,
            isActive: true,
            createdAt: true,

          },
        });
        controller.enqueue(encoder.encode(',"webhooks":'));
        controller.enqueue(encoder.encode(JSON.stringify(webhooks)));
        const teamMemberships = await db.teamMember.findMany({
          where: { userId },
          select: {
            id: true,
            team: { select: { id: true, name: true, slug: true } },
            role: true,
            joinedAt: true,
          },
        });
        controller.enqueue(encoder.encode(',"teamMemberships":'));
        controller.enqueue(encoder.encode(JSON.stringify(teamMemberships)));

        controller.enqueue(encoder.encode("}"));
        controller.close();
      },
    });
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",

        "content-disposition": `attachment; filename="resumerank-export-${userId}-${Date.now()}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
async function streamCollection(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  name: string,
  fetchPage: (skip: number) => Promise<unknown[]>
): Promise<void> {
  controller.enqueue(encoder.encode(`,"${name}":[`));
  let skip = 0;
  let first = true;

  for (let safety = 0; safety < 1000; safety++) {
    const batch = await fetchPage(skip);
    if (batch.length === 0) break;
    for (const row of batch) {
      controller.enqueue(
        encoder.encode(first ? JSON.stringify(row) : "," + JSON.stringify(row))
      );
      first = false;
    }
    if (batch.length < 500) break;
    skip += 500;
  }
  controller.enqueue(encoder.encode("]"));
}
