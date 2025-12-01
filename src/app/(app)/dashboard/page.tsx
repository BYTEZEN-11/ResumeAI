import type { Metadata } from "next";
import { auth } from "@/auth";
import { dashboardService } from "@/modules/dashboard/services/dashboard.service";
import { DashboardStats } from "@/modules/dashboard/components/dashboard-stats";
import { ScoreChart } from "@/modules/dashboard/components/score-chart";
import { MissingSkillsChart } from "@/modules/dashboard/components/missing-skills-chart";
import { RecentAnalyses } from "@/modules/dashboard/components/recent-analyses";
import { DashboardHeader } from "@/modules/dashboard/components/dashboard-header";
import { ProgressTracker } from "@/modules/dashboard/components/progress-tracker";
export const metadata: Metadata = { title: "Dashboard" };
export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [stats, scoreTrend, topMissingSkills, recentAnalyses] = await Promise.all([
    dashboardService.getStats(userId),
    dashboardService.getScoreTrend(userId, 90),
    dashboardService.getTopMissingSkills(userId, 8),
    dashboardService.getRecentAnalyses(userId, 5),
  ]);
  return (
    <div className="space-y-8 animate-fade-in">
      <DashboardHeader name={session!.user.name ?? "there"} />
      <DashboardStats stats={stats} />
      {}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ScoreChart data={scoreTrend} />
        </div>
        <div>
          <ProgressTracker data={scoreTrend} />
        </div>
      </div>
      {}
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <MissingSkillsChart data={topMissingSkills} />
        </div>
        <div className="lg:col-span-2">
          <RecentAnalyses analyses={recentAnalyses} />
        </div>
      </div>
    </div>
  );
}
