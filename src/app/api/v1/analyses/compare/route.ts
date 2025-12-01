import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  successResponse,
  handleApiError,
  unauthorizedResponse,
  validationErrorResponse,
  errorResponse,
} from "@/shared/utils/api-response";
import { ZodError } from "zod";
const schema = z.object({
  resumeId: z.string().cuid(),
  analysisIds: z
    .array(z.string().cuid())
    .min(2, "Select at least 2 analyses to compare")
    .max(5, "Maximum 5 analyses can be compared at once"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  try {
    const body = await req.json();
    const validated = schema.parse(body);

    const analyses = await db.resumeAnalysis.findMany({
      where: {
        id: { in: validated.analysisIds },
        userId: session.user.id,
        resumeId: validated.resumeId,
        status: "COMPLETED",
        deletedAt: null,
      },
      include: {
        jobDescription: { select: { title: true, company: true } },
        atsBreakdown: true,
        matchedSkills: { select: { skill: true, category: true } },
        missingSkills: { select: { skill: true, importance: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    if (analyses.length < 2) {
      return errorResponse(
        "Could not find enough completed analyses for comparison. Make sure the selected analyses are completed and belong to the same resume.",
        404
      );
    }

    const comparison = analyses.map((a) => ({
      id: a.id,
      jobTitle: a.jobDescription?.title ?? a.jobTitle ?? "Unknown",
      company: a.jobDescription?.company ?? a.company ?? "",
      createdAt: a.createdAt,
      scores: {
        atsScore: a.atsScore ?? 0,
        resumeScore: a.resumeScore ?? 0,
        skillMatchPct: Math.round(a.skillMatchPct ?? 0),
      },
      breakdown: a.atsBreakdown
        ? {
            keywordScore: a.atsBreakdown.keywordScore,
            formattingScore: a.atsBreakdown.formattingScore,
            sectionsScore: a.atsBreakdown.sectionsScore,
            readabilityScore: a.atsBreakdown.readabilityScore,
            experienceScore: a.atsBreakdown.experienceScore,
          }
        : null,
      matchedSkillsCount: a.matchedSkills.length,
      missingSkillsCount: a.missingSkills.length,
      topMissingSkills: a.missingSkills
        .filter((s) => s.importance === "critical")
        .slice(0, 5)
        .map((s) => s.skill),
    }));

    const best = comparison.reduce((prev, curr) =>
      curr.scores.atsScore > prev.scores.atsScore ? curr : prev
    );
    return successResponse(
      { analyses: comparison, bestId: best.id },
      "Comparison data retrieved"
    );
  } catch (error) {
    if (error instanceof ZodError) return validationErrorResponse(error);
    return handleApiError(error);
  }
}
