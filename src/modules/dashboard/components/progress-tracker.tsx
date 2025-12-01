"use client";
import {
  TrendingUp, TrendingDown, Minus, Target,
  ArrowRight, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { scoreToColor } from "@/lib/utils";
import type { ScoreTrend } from "@/types";
import Link from "next/link";
type Props = {
  data: ScoreTrend[];
};
type Milestone = {
  label: string;
  target: number;
  icon: string;
  color: string;
};
const MILESTONES: Milestone[] = [
  { label: "Getting Started", target: 40, icon: "🌱", color: "text-red-500" },
  { label: "Making Progress", target: 60, icon: "📈", color: "text-orange-500" },
  { label: "Good Standing", target: 75, icon: "⭐", color: "text-yellow-500" },
  { label: "Strong Profile", target: 85, icon: "🚀", color: "text-blue-500" },
  { label: "Top Candidate", target: 95, icon: "🏆", color: "text-green-500" },
];
function getCurrentMilestone(score: number): Milestone {
  return (
    [...MILESTONES].reverse().find((m) => score >= m.target) ?? MILESTONES[0]
  );
}
function getNextMilestone(score: number): Milestone | null {
  return MILESTONES.find((m) => score < m.target) ?? null;
}
export function ProgressTracker({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Progress Tracker
          </CardTitle>
          <CardDescription>Track your resume improvement over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <Target className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Run your first analysis to start tracking progress.
            </p>
            <Button size="sm" asChild>
              <Link href="/analyze">
                <Sparkles className="h-4 w-4" />
                Analyze Now
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  const latest = data[data.length - 1];
  const first = data[0];
  const currentScore = latest.atsScore;

  const scoreDiff = data.length > 1 ? currentScore - first.atsScore : 0;
  const skillDiff = data.length > 1 ? latest.skillMatch - first.skillMatch : 0;

  const bestScore = Math.max(...data.map((d) => d.atsScore));
  const bestSkill = Math.max(...data.map((d) => d.skillMatch));

  const recent7 = data.slice(-7);
  const prev7 = data.slice(-14, -7);
  const recentAvg = recent7.reduce((s, d) => s + d.atsScore, 0) / recent7.length;
  const prevAvg =
    prev7.length > 0
      ? prev7.reduce((s, d) => s + d.atsScore, 0) / prev7.length
      : recentAvg;
  const weeklyChange = Math.round(recentAvg - prevAvg);
  const current = getCurrentMilestone(currentScore);
  const next = getNextMilestone(currentScore);
  const progressToNext = next
    ? Math.round(((currentScore - (current.target)) / (next.target - current.target)) * 100)
    : 100;
  const TrendIcon =
    scoreDiff > 0 ? TrendingUp : scoreDiff < 0 ? TrendingDown : Minus;
  const trendColor =
    scoreDiff > 0
      ? "text-green-500"
      : scoreDiff < 0
      ? "text-red-500"
      : "text-muted-foreground";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Progress Tracker
            </CardTitle>
            <CardDescription>
              Based on {data.length} analys{data.length === 1 ? "is" : "es"}
            </CardDescription>
          </div>
          {data.length > 1 && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              {scoreDiff > 0 ? "+" : ""}{scoreDiff} pts overall
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {}
        <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{current.icon}</span>
              <div>
                <p className="text-sm font-semibold">{current.label}</p>
                <p className="text-xs text-muted-foreground">Current milestone</p>
              </div>
            </div>
            <span className={`text-3xl font-bold tabular-nums ${scoreToColor(currentScore)}`}>
              {currentScore}
            </span>
          </div>
          {}
          {next && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress to {next.label}</span>
                <span className="flex items-center gap-1">
                  {next.icon} {next.target}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
              <Progress value={Math.max(0, progressToNext)} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {next.target - currentScore} more points to reach <strong>{next.label}</strong>
              </p>
            </div>
          )}
          {!next && (
            <Badge className="w-full justify-center py-1">
              🏆 Top Candidate — Maximum milestone reached!
            </Badge>
          )}
        </div>
        {}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Best ATS Score</p>
            <p className={`text-xl font-bold ${scoreToColor(bestScore)}`}>{bestScore}</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Best Skill Match</p>
            <p className={`text-xl font-bold ${scoreToColor(bestSkill)}`}>{Math.round(bestSkill)}%</p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">ATS Improvement</p>
            <p className={`text-xl font-bold ${scoreDiff >= 0 ? "text-green-500" : "text-red-500"}`}>
              {scoreDiff >= 0 ? "+" : ""}{scoreDiff} pts
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Weekly Trend</p>
            <p className={`text-xl font-bold ${weeklyChange >= 0 ? "text-green-500" : "text-red-500"}`}>
              {weeklyChange >= 0 ? "+" : ""}{weeklyChange} pts
            </p>
          </div>
        </div>
        {}
        {data.length > 1 && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Skill Match Improvement</p>
              <span className={`text-xs font-semibold ${skillDiff >= 0 ? "text-green-500" : "text-red-500"}`}>
                {skillDiff >= 0 ? "+" : ""}{Math.round(skillDiff)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>First</span>
                  <span>{Math.round(first.skillMatch)}%</span>
                </div>
                <Progress value={first.skillMatch} className="h-1.5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Latest</span>
                  <span>{Math.round(latest.skillMatch)}%</span>
                </div>
                <Progress value={latest.skillMatch} className="h-1.5" />
              </div>
            </div>
          </div>
        )}
        {}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Milestones
          </p>
          <div className="space-y-1.5">
            {MILESTONES.map((m) => {
              const achieved = currentScore >= m.target;
              return (
                <div
                  key={m.label}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                    achieved ? "bg-primary/5 border border-primary/20" : "opacity-50"
                  }`}
                >
                  <span className="text-base">{m.icon}</span>
                  <span className="text-xs font-medium flex-1">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.target}+ pts</span>
                  {achieved && (
                    <Badge variant="success" className="text-xs py-0 px-1.5">Done</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
