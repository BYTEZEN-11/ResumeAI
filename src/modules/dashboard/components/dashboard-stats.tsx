import { FileText, Sparkles, Target, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { DashboardStats as Stats } from "@/types";
export function DashboardStats({ stats }: { stats: Stats }) {
  const items = [
    {
      label: "Total Resumes",
      value: stats.totalResumes,
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Analyses Run",
      value: stats.totalAnalyses,
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Avg ATS Score",
      value: `${stats.averageAtsScore}/100`,
      icon: Target,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "This Month",
      value: stats.analysesThisMonth,
      icon: TrendingUp,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      sub:
        stats.improvementTrend !== 0
          ? `${stats.improvementTrend > 0 ? "+" : ""}${stats.improvementTrend}% vs last month`
          : undefined,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold">{item.value}</p>
                  {item.sub && (
                    <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
                  )}
                </div>
                <div className={`rounded-xl p-3 ${item.bg}`}>
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
