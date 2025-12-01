import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

vi.mock("@/lib/openai", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
    embeddings: {
      create: vi.fn(),
    },
  },
  AI_MODELS: {
    analysis: "gpt-4o-mini",
    rewrite: "gpt-4o",
    embedding: "text-embedding-3-small",
  },
}));
import { analysisService } from "@/modules/analysis/services/analysis.service";
import { db } from "@/lib/db";
describe("Analysis Service Integration Tests", () => {
  let testUserId: string;
  let testResumeId: string;
  let testJobDescId: string;
  let testAnalysisId: string;
  beforeAll(async () => {

    const testEmail = `test-analysis-${Date.now()}@example.com`;
    const user = await db.user.create({
      data: {
        email: testEmail,
        emailNormalized: testEmail.toLowerCase(),
        name: "Test Analysis User",
        passwordHash: "dummy",
        role: "USER",
      },
    });
    testUserId = user.id;

    await db.subscription.create({
      data: {
        userId: testUserId,
        plan: "FREE",
        analysesLimit: 3,
        analysesUsed: 0,
      },
    });

    const resume = await db.resume.create({
      data: {
        userId: testUserId,
        title: "Test Resume",
        fileUrl: "https://example.com/resume.pdf",
        fileName: "resume.pdf",
        fileSize: 1000,
        fileType: "PDF",
        storagePath: "/test/resume.pdf",
      },
    });
    testResumeId = resume.id;

    const jobDesc = await db.jobDescription.create({
      data: {
        userId: testUserId,
        title: "Software Engineer",
        company: "Test Company",
        description: "Looking for a talented software engineer...",
      },
    });
    testJobDescId = jobDesc.id;
  });
  afterAll(async () => {

    if (testAnalysisId) {
      await db.resumeAnalysis.delete({ where: { id: testAnalysisId } }).catch(() => {});
    }
    if (testJobDescId) {
      await db.jobDescription.delete({ where: { id: testJobDescId } }).catch(() => {});
    }
    if (testResumeId) {
      await db.resume.delete({ where: { id: testResumeId } }).catch(() => {});
    }
    if (testUserId) {
      await db.subscription.delete({ where: { userId: testUserId } }).catch(() => {});
      await db.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });
  describe("Create Analysis", () => {
    it("should create analysis and increment usage count", async () => {

      vi.mock("@/lib/inngest", () => ({
        inngest: {
          send: vi.fn().mockResolvedValue({ ids: ["test-id"] }),
        },
      }));
      const analysis = await analysisService.createAnalysis({
        userId: testUserId,
        resumeId: testResumeId,
        jobDescriptionId: testJobDescId,
      });
      testAnalysisId = analysis.id;
      expect(analysis).toBeDefined();
      expect(analysis.status).toBe("PENDING");
      expect(analysis.userId).toBe(testUserId);
      expect(analysis.resumeId).toBe(testResumeId);
      expect(analysis.jobDescriptionId).toBe(testJobDescId);

      const subscription = await db.subscription.findUnique({
        where: { userId: testUserId },
      });
      expect(subscription?.analysesUsed).toBe(1);
    });
    it("should enforce analysis limits for FREE users", async () => {

      await db.subscription.update({
        where: { userId: testUserId },
        data: { analysesUsed: 3 },
      });
      await expect(
        analysisService.createAnalysis({
          userId: testUserId,
          resumeId: testResumeId,
          jobDescriptionId: testJobDescId,
        })
      ).rejects.toThrow(/limit/);

      await db.subscription.update({
        where: { userId: testUserId },
        data: { analysesUsed: 1 },
      });
    });
  });
  describe("Get Analysis", () => {
    it("should retrieve analysis by ID", async () => {
      const analysis = await analysisService.getAnalysis(testAnalysisId, testUserId);
      expect(analysis).toBeDefined();
      expect(analysis.id).toBe(testAnalysisId);
      expect(analysis.resume).toBeDefined();
      expect(analysis.jobDescription).toBeDefined();
    });
    it("should not allow access to other user's analyses", async () => {
      await expect(
        analysisService.getAnalysis(testAnalysisId, "other-user-id")
      ).rejects.toThrow();
    });
  });
  describe("List Analyses", () => {
    it("should list user's analyses with pagination", async () => {
      const result = await analysisService.listAnalyses({
        userId: testUserId,
        page: 1,
        pageSize: 10,
      });
      expect(result.analyses).toBeDefined();
      expect(Array.isArray(result.analyses)).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(10);
    });
    it("should filter analyses by status", async () => {
      const result = await analysisService.listAnalyses({
        userId: testUserId,
        status: "PENDING",
      });
      expect(result.analyses.every((a) => a.status === "PENDING")).toBe(true);
    });
  });
});
