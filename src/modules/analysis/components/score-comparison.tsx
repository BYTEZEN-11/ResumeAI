"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Trophy, Loader2, GitCompare,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { apiFetch } from "@/shared/hooks/use-api";
import { scoreToColor, formatRelativeTime } from "@/lib/utils";
import type { Resume, ResumeAnalysis } from "@/types";
type ComparisonItem = {
  id: string;
  jobTitle: string;
  company: string;
  createdAt: string;
  scores: { atsScore: number; resumeScore: number; skillMatchPct: number };
  breakdown: {
    keywordScore: number;
    formattingScore: number;
    sectionsScore: number;
    readabilityScore: number;
    experienceScore: number;
  } | null;
  matchedSkillsCount: number;
  missingSkillsCount: number;
  topMissingSkills: string[];
};
type ComparisonResult = {
  analyses: ComparisonItem[];
  bestId: string;
};
const BREAKDOWN_LABELS: Record<string, string> = {
  keywordScore: "Keywords",
  formattingScore: "Formatting",
  sectionsScore: "Sections",
  readabilityScore: "Readability",
  experienceScore: "Experience",
};
function ScoreBar({
  label,
  score,
  isBest,
}: {
  label: string;
  score: number;
  isBest: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${scoreToColor(score)}`}>{score}</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isBest ? "bg-primary" : "bg-muted-foreground/40"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
export function ScoreComparison() {
  const [resumeId, setResumeId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { data: resumesData } = useQuery({
    queryKey: ["resumes-select"],
    queryFn: () => apiFetch<Resume[]>("/api/v1/resumes?pageSize=50"),
  });
  const { data: analysesData, isLoading: loadingAnalyses } = useQuery({
    queryKey: ["analyses-for-resume", resumeId],
    queryFn: () =>
      apiFetch<ResumeAnalysis[]>(
        `/api/v1/analyses?pageSize=50&status=COMPLETED&resumeId=${resumeId}`
      ),
    enabled: !!resumeId,
  });
  const resumes = resumesData?.data ?? [];
  const analyses = (analysesData?.data ?? []) as (ResumeAnalysis & {
    jobDescription?: { title: string; company: string | null };
  })[];
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= 5
        ? (toast.error("Maximum 5 analyses"), prev)
        : [...prev, id]
    );
    setResult(null);
  }
  async function runComparison() {
    if (selectedIds.length < 2) {
      toast.error("Select at least 2 analyses");
      return;
    }
    setComparing(true);
    setResult(null);
    try {
      const res = await apiFetch<ComparisonResult>("/api/v1/analyses/compare", {
        method: "POST",
        body: JSON.stringify({ resumeId, analysisIds: selectedIds }),
      });
      if (!res.data) throw new Error("No data");
      setResult(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setComparing(false);
    }
  }
  return (
    <div className="space-y-6">
      {}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            Step 1 — Select Resume
          </CardTitle>
          <CardDescription>
            Choose the resume you want to compare across different jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {resumes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No resumes.{" "}
                <a href="/resumes" className="text-primary hover:underline">
                  Upload one first.
                </a>
              </p>
            ) : (
              resumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setResumeId(r.id);
                    setSelectedIds([]);
                    setResult(null);
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    resumeId === r.id
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {r.title}
                  <span className="ml-1.5 text-xs text-muted-foreground">v{r.version}</span>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      {}
      {resumeId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Step 2 — Select Analyses to Compare
            </CardTitle>
            <CardDescription>
              Select 2–5 completed analyses. We&apos;ll compare scores side by side.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAnalyses ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : analyses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No completed analyses for this resume.{" "}
                <a href="/analyze" className="text-primary hover:underline">
                  Run an analysis first.
                </a>
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {analyses.map((a) => {
                    const isSelected = selectedIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleSelect(a.id)}
                        className={`w-full rounded-lg border px-4 py-3 text-left transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {a.jobDescription?.title ?? a.jobTitle ?? "Unknown"}
                            {(a.jobDescription?.company ?? a.company) && (
                              <span className="ml-1.5 font-normal text-muted-foreground">
                                @ {a.jobDescription?.company ?? a.company}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(a.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {a.atsScore !== null && (
                            <span className={`text-sm font-bold ${scoreToColor(a.atsScore)}`}>
                              {a.atsScore}/100
                            </span>
                          )}
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    {selectedIds.length} / 5 selected (min 2)
                  </p>
                  <Button
                    onClick={runComparison}
                    disabled={selectedIds.length < 2 || comparing}
                  >
                    {comparing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Comparing...
                      </>
                    ) : (
                      <>
                        <GitCompare className="h-4 w-4" />
                        Compare {selectedIds.length} Analyses
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
      {}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Comparison Results</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBreakdown(!showBreakdown)}
            >
              {showBreakdown ? (
                <ChevronUp className="h-4 w-4 mr-1.5" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1.5" />
              )}
              {showBreakdown ? "Hide" : "Show"} Breakdown
            </Button>
          </div>
          {}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${result.analyses.length}, minmax(0, 1fr))`,
            }}
          >
            {result.analyses.map((item) => {
              const isBest = item.id === result.bestId;
              return (
                <Card
                  key={item.id}
                  className={`relative ${
                    isBest ? "border-primary ring-1 ring-primary" : ""
                  }`}
                >
                  {isBest && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="text-xs flex items-center gap-1">
                        <Trophy className="h-3 w-3" />
                        Best Match
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-4 space-y-4 pt-6">
                    {}
                    <div className="min-h-[48px]">
                      <p className="text-sm font-semibold leading-tight">{item.jobTitle}</p>
                      {item.company && (
                        <p className="text-xs text-muted-foreground">{item.company}</p>
                      )}
                    </div>
                    {}
                    <div className="space-y-3">
                      <ScoreBar
                        label="ATS Score"
                        score={item.scores.atsScore}
                        isBest={isBest}
                      />
                      <ScoreBar
                        label="Resume Score"
                        score={item.scores.resumeScore}
                        isBest={isBest}
                      />
                      <ScoreBar
                        label="Skill Match %"
                        score={item.scores.skillMatchPct}
                        isBest={isBest}
                      />
                    </div>
                    {}
                    <div className="flex gap-3 text-xs">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {item.matchedSkillsCount} matched
                      </div>
                      <div className="flex items-center gap-1 text-red-500">
                        <XCircle className="h-3.5 w-3.5" />
                        {item.missingSkillsCount} missing
                      </div>
                    </div>
                    {}
                    {item.topMissingSkills.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">
                          Critical gaps:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.topMissingSkills.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs text-red-600"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {}
                    {showBreakdown && item.breakdown && (
                      <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          ATS Breakdown
                        </p>
                        {Object.entries(item.breakdown).map(([key, val]) => (
                          <div key={key} className="space-y-0.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {BREAKDOWN_LABELS[key] ?? key}
                              </span>
                              <span className="font-medium">{val}</span>
                            </div>
                            <Progress value={val} className="h-1" />
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      asChild
                    >
                      <a href={`/history/${item.id}`}>View Full Analysis</a>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
