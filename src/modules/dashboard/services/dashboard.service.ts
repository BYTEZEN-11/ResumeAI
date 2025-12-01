import { db } from "@/lib/db";
import type { DashboardStats, ScoreTrend, TopMissingSkill } from "@/types";
export class DashboardService {
  async getStats(userId: string): Promise<DashboardStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const [
      totalResumes,
      totalAnalyses,
      analysesThisMonth,
      analysesLastMonth,
      avgScores,
    ] = await Promise.all([
      db.resume.count({ where: { userId, deletedAt: null } }),
      db.resumeAnalysis.count({
        where: { userId, deletedAt: null, status: "COMPLETED" },
      }),
      db.resumeAnalysis.count({
        where: {
          userId,
          deletedAt: null,
          status: "COMPLETED",
          createdAt: { gte: startOfMonth },
        },
      }),
      db.resumeAnalysis.count({
        where: {
          userId,
          deletedAt: null,
          status: "COMPLETED",
          createdAt: { gte: lastMonth, lte: endOfLastMonth },
        },
      }),
      db.resumeAnalysis.aggregate({
        where: { userId, deletedAt: null, status: "COMPLETED" },
        _avg: { atsScore: true, skillMatchPct: true },
      }),
    ]);
    const improvementTrend =
      analysesLastMonth > 0
        ? Math.round(((analysesThisMonth - analysesLastMonth) / analysesLastMonth) * 100)
        : 0;
    return {
      totalResumes,
      totalAnalyses,
      averageAtsScore: Math.round(avgScores._avg.atsScore ?? 0),
      averageSkillMatch: Math.round(avgScores._avg.skillMatchPct ?? 0),
      analysesThisMonth,
      improvementTrend,
    };
  }
  async getScoreTrend(userId: string, days = 30): Promise<ScoreTrend[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const analyses = await db.resumeAnalysis.findMany({
      where: {
        userId,
        deletedAt: null,
        status: "COMPLETED",
        createdAt: { gte: since },
      },
      select: {
        createdAt: true,
        atsScore: true,
        skillMatchPct: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return analyses.map((a) => ({
      date: a.createdAt.toISOString().split("T")[0],
      atsScore: a.atsScore ?? 0,
      skillMatch: a.skillMatchPct ?? 0,
    }));
  }
  async getTopMissingSkills(userId: string, limit = 10): Promise<TopMissingSkill[]> {
    const result = await db.missingSkill.groupBy({
      by: ["skill", "category"],
      where: {
        analysis: { userId, deletedAt: null, status: "COMPLETED" },
      },
      _count: { skill: true },
      orderBy: { _count: { skill: "desc" } },
      take: limit,
    });
    return result.map((r) => ({
      skill: r.skill,
      count: r._count.skill,
      category: r.category,
    }));
  }
  async getRecentAnalyses(userId: string, limit = 5) {
    return db.resumeAnalysis.findMany({
      where: { userId, deletedAt: null },
      include: {
        resume: { select: { title: true } },
        jobDescription: { select: { title: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
  async exportAnalysesAsCsv(userId: string): Promise<string> {
    const analyses = await db.resumeAnalysis.findMany({
      where: { userId, deletedAt: null, status: "COMPLETED" },
      include: {
        resume: { select: { title: true } },
        jobDescription: { select: { title: true, company: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const headers = [
      "Date",
      "Resume",
      "Job Title",
      "Company",
      "ATS Score",
      "Resume Score",
      "Skill Match %",
      "Status",
    ];
    const rows = analyses.map((a) => [
      a.createdAt.toISOString().split("T")[0],
      a.resume.title,
      a.jobDescription.title,
      a.jobDescription.company ?? "",
      a.atsScore ?? "",
      a.resumeScore ?? "",
      a.skillMatchPct ? `${a.skillMatchPct.toFixed(1)}%` : "",
      a.status,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    return csvContent;
  }
}
export const dashboardService = new DashboardService();
