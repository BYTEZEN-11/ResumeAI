import { db } from "@/lib/db";
import { inngest } from "@/lib/inngest";
import { aiAnalysisService } from "./ai-analysis.service";
import { textExtractorService } from "./text-extractor.service";
import { webhookService } from "@/modules/webhooks/services/webhook.service";
import { PLAN_LIMITS } from "@/constants";
import type { AnalysisWithRelations, PaginationMeta, RawAnalysisResult } from "@/types";
import type { AnalysisStatus } from "@prisma/client";
export type CreateAnalysisInput = {
  userId: string;
  resumeId: string;
  jobDescriptionId: string;
};
export type AnalysisListParams = {
  userId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AnalysisStatus;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};
export class AnalysisService {
  async createAnalysis(input: CreateAnalysisInput) {

    const [resume, jobDescription] = await Promise.all([
      db.resume.findFirst({
        where: { id: input.resumeId, userId: input.userId, deletedAt: null },
      }),
      db.jobDescription.findFirst({
        where: { id: input.jobDescriptionId, userId: input.userId, deletedAt: null },
      }),
    ]);
    if (!resume) throw new Error("Resume not found");
    if (!jobDescription) throw new Error("Job description not found");

    const analysis = await db.$transaction(async (tx) => {

      const updatedSub = await tx.subscription.updateMany({
        where: {
          userId: input.userId,
          OR: [
            { plan: { in: ["PRO", "TEAM"] } },
            { plan: "FREE", analysesUsed: { lt: PLAN_LIMITS.FREE.analysesPerMonth } },
          ],
        },
        data: { analysesUsed: { increment: 1 } },
      });
      if (updatedSub.count === 0) {
        throw new Error(
          "You have reached your monthly analysis limit. Please upgrade to Pro for unlimited analyses."
        );
      }
      return tx.resumeAnalysis.create({
        data: {
          userId: input.userId,
          resumeId: input.resumeId,
          jobDescriptionId: input.jobDescriptionId,
          status: "PENDING",
          jobTitle: jobDescription.title,
          company: jobDescription.company,
        },
      });
    });

    try {
      await inngest.send({
        name: "analysis/requested",
        data: {
          analysisId: analysis.id,
          userId: input.userId,
          resumeId: input.resumeId,
          jobDescriptionId: input.jobDescriptionId,
        },
      });
    } catch (err) {

      console.error("Failed to enqueue analysis/requested, refunding quota", err);
      await db.subscription.updateMany({
        where: { userId: input.userId, analysesUsed: { gt: 0 } },
        data: { analysesUsed: { decrement: 1 } },
      });
      throw new Error("Failed to queue analysis. Please try again.");
    }
    return analysis;
  }
  async processAnalysis(analysisId: string): Promise<void> {

    const claimed = await db.resumeAnalysis.updateMany({
      where: { id: analysisId, status: "PENDING", deletedAt: null },
      data: { status: "PROCESSING" },
    });
    if (claimed.count === 0) {

      return;
    }
    const startTime = Date.now();
    try {
      const analysis = await db.resumeAnalysis.findUnique({
        where: { id: analysisId },
        include: { resume: true, jobDescription: true },
      });
      if (!analysis) throw new Error("Analysis not found");
      const resumeText = await textExtractorService.getOrExtract(
        analysis.resume.id,
        analysis.resume.storagePath,
        analysis.resume.fileType
      );
      const result = await aiAnalysisService.analyzeResume({
        resumeText,
        jobDescriptionText: analysis.jobDescription.description,
        jobTitle: analysis.jobDescription.title,
        company: analysis.jobDescription.company ?? undefined,
      });
      const processingTime = Date.now() - startTime;
      await this.storeAnalysisResults(analysisId, result, processingTime);
      await this.notifyAnalysisComplete(analysis.userId, analysisId, result.atsScore);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Analysis failed";

      const analysis = await db.resumeAnalysis.findUnique({
        where: { id: analysisId },
        select: { userId: true },
      });

      await db.$transaction(async (tx) => {
        await tx.resumeAnalysis.update({
          where: { id: analysisId },
          data: {
            status: "FAILED",
            error: errorMessage,
            processingTime: Date.now() - startTime,
          },
        });
        if (analysis?.userId) {
          await tx.subscription.updateMany({
            where: { userId: analysis.userId, analysesUsed: { gt: 0 } },
            data: { analysesUsed: { decrement: 1 } },
          });
        }
      });
      if (analysis?.userId) {
        await db.notification.create({
          data: {
            userId: analysis.userId,
            type: "ANALYSIS_FAILED",
            title: "Analysis Failed",
            message: `Your resume analysis failed: ${errorMessage}. Your analysis quota has been refunded.`,
            metadata: { analysisId, error: errorMessage },
          },
        });
      }
      throw error;
    }
  }
  private async storeAnalysisResults(
    analysisId: string,
    result: RawAnalysisResult,
    processingTime: number
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      await tx.resumeAnalysis.update({
        where: { id: analysisId },
        data: {
          status: "COMPLETED",
          atsScore: result.atsScore,
          resumeScore: result.resumeScore,
          skillMatchPct: result.skillMatchPct,
          processingTime,
          completedAt: new Date(),
        },
      });
      await tx.aTSBreakdown.create({
        data: {
          analysisId,
          keywordScore: result.atsBreakdown.keywordScore,
          formattingScore: result.atsBreakdown.formattingScore,
          sectionsScore: result.atsBreakdown.sectionsScore,
          readabilityScore: result.atsBreakdown.readabilityScore,
          experienceScore: result.atsBreakdown.experienceScore,
          overallScore: result.atsBreakdown.overallScore,
          keywordDetails: result.atsBreakdown.keywordDetails as import("@prisma/client").Prisma.InputJsonValue,
        },
      });
      if (result.matchedSkills.length > 0) {
        await tx.matchedSkill.createMany({
          data: result.matchedSkills.map((s) => ({
            analysisId, skill: s.skill, category: s.category, proficiency: s.proficiency,
          })),
        });
      }
      if (result.missingSkills.length > 0) {
        await tx.missingSkill.createMany({
          data: result.missingSkills.map((s) => ({
            analysisId, skill: s.skill, category: s.category, importance: s.importance, reason: s.reason,
          })),
        });
      }
      if (result.recommendations.length > 0) {
        await tx.recommendation.createMany({
          data: result.recommendations.map((r) => ({
            analysisId, section: r.section, type: r.type, priority: r.priority,
            title: r.title, description: r.description, example: r.example,
          })),
        });
      }
      if (result.interviewQuestions.length > 0) {
        await tx.interviewQuestion.createMany({
          data: result.interviewQuestions.map((q) => ({
            analysisId, question: q.question, category: q.category, difficulty: q.difficulty, hint: q.hint,
          })),
        });
      }
      if (result.rewriteSuggestions.length > 0) {
        await tx.rewriteSuggestion.createMany({
          data: result.rewriteSuggestions.map((s) => ({
            analysisId, section: s.section, original: s.original, rewritten: s.rewritten, explanation: s.explanation,
          })),
        });
      }
      if (result.careerRecommendations.length > 0) {
        await tx.careerRecommendation.createMany({
          data: result.careerRecommendations.map((c) => ({
            analysisId, title: c.title, description: c.description, skillsToAdd: c.skillsToAdd, timeline: c.timeline,
          })),
        });
      }
    });
  }
  async getAnalysis(id: string, userId: string): Promise<AnalysisWithRelations> {
    const analysis = await db.resumeAnalysis.findFirst({
      where: { id, userId, deletedAt: null },
      include: {
        resume: true,
        jobDescription: true,
        atsBreakdown: true,
        matchedSkills: true,
        missingSkills: true,
        recommendations: { orderBy: { priority: "asc" } },
        interviewQuestions: true,
        rewriteSuggestions: true,
        careerRecommendations: true,
      },
    });
    if (!analysis) throw new Error("Analysis not found");
    return analysis as AnalysisWithRelations;
  }
  async listAnalyses(
    params: AnalysisListParams
  ): Promise<{ analyses: AnalysisWithRelations[]; meta: PaginationMeta }> {
    const { userId, page = 1, pageSize = 10, search, status, startDate, endDate, sortOrder = "desc" } = params;
    const where = {
      userId,
      deletedAt: null,
      ...(status && { status }),
      ...((startDate ?? endDate)
        ? { createdAt: { ...(startDate && { gte: new Date(startDate) }), ...(endDate && { lte: new Date(endDate) }) } }
        : {}),
      ...(search && {
        OR: [
          { jobTitle: { contains: search, mode: "insensitive" as const } },
          { company: { contains: search, mode: "insensitive" as const } },
          { resume: { title: { contains: search, mode: "insensitive" as const } } },
        ],
      }),
    };
    const [total, analyses] = await Promise.all([
      db.resumeAnalysis.count({ where }),
      db.resumeAnalysis.findMany({
        where,
        include: {
          resume: true,
          jobDescription: true,
          atsBreakdown: true,
          matchedSkills: true,
          missingSkills: true,
          recommendations: { orderBy: { priority: "asc" } },
          interviewQuestions: true,
          rewriteSuggestions: true,
          careerRecommendations: true,
        },
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      analyses: analyses as AnalysisWithRelations[],
      meta: {
        page, pageSize, total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
        hasPrevPage: page > 1,
      },
    };
  }
  async softDeleteAnalysis(id: string, userId: string): Promise<void> {
    const analysis = await db.resumeAnalysis.findFirst({ where: { id, userId, deletedAt: null } });
    if (!analysis) throw new Error("Analysis not found");
    await db.resumeAnalysis.update({ where: { id }, data: { deletedAt: new Date() } });
  }
  private async notifyAnalysisComplete(userId: string, analysisId: string, atsScore: number): Promise<void> {
    await db.notification.create({
      data: {
        userId,
        type: "ANALYSIS_COMPLETE",
        title: "Analysis Complete",
        message: `Your resume analysis is ready. ATS Score: ${atsScore}/100`,
        metadata: { analysisId, atsScore },
      },
    });
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (user) {
      await inngest.send({
        name: "email/send-analysis-complete",
        data: { userId, email: user.email, name: user.name ?? "", analysisId, atsScore },
      });
    }

    webhookService
      .dispatchEvent(userId, "ANALYSIS_COMPLETE", {
        analysisId,
        atsScore,
        url: `${process.env.NEXT_PUBLIC_APP_URL}/history/${analysisId}`,
      })
      .catch(() => {});
  }
}
export const analysisService = new AnalysisService();
