import { describe, it, expect } from "vitest";
import { z } from "zod";

const llmResponseSchema = z.object({
  atsScore: z.number().min(0).max(100),
  resumeScore: z.number().min(0).max(100),
  skillMatchPct: z.number().min(0).max(100),
  atsBreakdown: z.object({
    keywordScore: z.number().min(0).max(100),
    formattingScore: z.number().min(0).max(100),
    sectionsScore: z.number().min(0).max(100),
    readabilityScore: z.number().min(0).max(100),
    experienceScore: z.number().min(0).max(100),
    overallScore: z.number().min(0).max(100),
    keywordDetails: z
      .object({
        matched: z.array(z.string()).optional(),
        missing: z.array(z.string()).optional(),
      })
      .partial()
      .optional(),
  }),
  matchedSkills: z
    .array(
      z.object({
        skill: z.string(),
        category: z.string().optional(),
        proficiency: z.string().optional(),
      })
    )
    .default([]),
  missingSkills: z
    .array(
      z.object({
        skill: z.string(),
        category: z.string().optional(),
        importance: z.string().optional(),
        reason: z.string().optional(),
      })
    )
    .default([]),
  recommendations: z
    .array(
      z.object({
        section: z.string(),
        type: z.string(),
        priority: z.string(),
        title: z.string(),
        description: z.string(),
        example: z.string().optional(),
      })
    )
    .default([]),
  interviewQuestions: z
    .array(
      z.object({
        question: z.string(),
        category: z.string(),
        difficulty: z.string(),
        hint: z.string().optional(),
      })
    )
    .default([]),
  rewriteSuggestions: z
    .array(
      z.object({
        section: z.string(),
        original: z.string(),
        rewritten: z.string(),
        explanation: z.string().optional(),
      })
    )
    .default([]),
  careerRecommendations: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        skillsToAdd: z.array(z.string()).default([]),
        timeline: z.string().optional(),
      })
    )
    .default([]),
});
function validResult() {
  return {
    atsScore: 75,
    resumeScore: 80,
    skillMatchPct: 70.5,
    atsBreakdown: {
      keywordScore: 80,
      formattingScore: 75,
      sectionsScore: 90,
      readabilityScore: 70,
      experienceScore: 65,
      overallScore: 75,
    },
    matchedSkills: [],
    missingSkills: [],
    recommendations: [],
    interviewQuestions: [],
    rewriteSuggestions: [],
    careerRecommendations: [],
  };
}
describe("LLM response Zod schema", () => {
  it("accepts a well-formed response", () => {
    const result = llmResponseSchema.safeParse(validResult());
    expect(result.success).toBe(true);
  });
  it("rejects a missing top-level field (atsScore)", () => {
    const input = validResult() as Record<string, unknown>;
    delete input["atsScore"];
    const result = llmResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
  it("rejects a NaN score — the bug that motivated this schema", () => {
    const input = validResult();
    (input as unknown as { atsScore: number }).atsScore = Number.NaN;
    const result = llmResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
  it("rejects a string score (the previous bug 'atsScore: high')", () => {
    const input = validResult() as unknown as { atsScore: unknown };
    input.atsScore = "high";
    const result = llmResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
  it("rejects a score above 100 (DB out-of-range)", () => {
    const input = validResult();
    (input as unknown as { atsScore: number }).atsScore = 150;
    const result = llmResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
  it("rejects a negative score", () => {
    const input = validResult();
    (input as unknown as { atsScore: number }).atsScore = -5;
    const result = llmResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
  it("rejects NaN inside atsBreakdown (would silently store 0)", () => {
    const input = validResult();
    (input.atsBreakdown as unknown as { keywordScore: number }).keywordScore = Number.NaN;
    const result = llmResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
  it("defaults missing arrays to [] instead of failing", () => {

    const input = validResult() as Record<string, unknown>;
    delete input["matchedSkills"];
    delete input["careerRecommendations"];
    const result = llmResponseSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.matchedSkills).toEqual([]);
      expect(result.data.careerRecommendations).toEqual([]);
    }
  });
  it("rejects an invalid matchedSkills entry (missing required 'skill' field)", () => {
    const input = validResult();
    (input as unknown as { matchedSkills: unknown[] }).matchedSkills = [
      { category: "tech" },
    ];
    const result = llmResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
  it("accepts keywordDetails with extra fields (forward-compat)", () => {
    const input = validResult();
    (input.atsBreakdown as unknown as { keywordDetails: unknown }).keywordDetails = {
      matched: ["a"],
      missing: ["b"],
      futureField: "ignored",
    };
    const result = llmResponseSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});
