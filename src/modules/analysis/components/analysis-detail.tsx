"use client";
import Link from "next/link";
import { ArrowLeft, Clock, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Badge } from "@/shared/components/ui/badge";
import { AtsScoreCard } from "./ats-score-card";
import { SkillsPanel } from "./skills-panel";
import { RecommendationsPanel } from "./recommendations-panel";
import { InterviewQuestionsPanel } from "./interview-questions-panel";
import { RewriteSuggestionsPanel } from "./rewrite-suggestions-panel";
import { CareerRecommendationsPanel } from "./career-recommendations-panel";
import { formatDate } from "@/lib/utils";
import type { AnalysisWithRelations } from "@/types";
export function AnalysisDetail({ analysis: initial }: { analysis: AnalysisWithRelations }) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState(initial);
  const isPending = analysis.status === "PENDING" || analysis.status === "PROCESSING";

  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/analyses/${analysis.id}`);
        const data = await res.json();
        if (data.data?.status !== "PENDING" && data.data?.status !== "PROCESSING") {
          setAnalysis(data.data);
          clearInterval(interval);
          router.refresh();
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [isPending, analysis.id, router]);
  const statusBadge = () => {
    switch (analysis.status) {
      case "COMPLETED":
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "FAILED":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case "PROCESSING":
        return <Badge variant="info"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };
  return (
    <div className="space-y-6 animate-fade-in">
      {}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">
                {analysis.jobDescription?.title ?? analysis.jobTitle ?? "Analysis"}
              </h1>
              {statusBadge()}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {analysis.jobDescription?.company ?? analysis.company ?? ""}
              {(analysis.jobDescription?.company ?? analysis.company) && " · "}
              {formatDate(analysis.createdAt)}
              {analysis.processingTime && ` · ${(analysis.processingTime / 1000).toFixed(1)}s`}
            </p>
          </div>
        </div>
        {analysis.status === "FAILED" && (
          <Button size="sm" asChild>
            <Link href="/analyze">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Link>
          </Button>
        )}
      </div>
      {isPending ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="relative mb-6">
            <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          </div>
          <h3 className="text-lg font-semibold">Analyzing your resume...</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            The AI is processing your resume. This usually takes 15–30 seconds.
            This page will update automatically.
          </p>
        </div>
      ) : analysis.status === "FAILED" ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <XCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold">Analysis failed</h3>
          <p className="text-muted-foreground mt-1">{analysis.error ?? "Something went wrong."}</p>
        </div>
      ) : (
        <>
          {}
          <div className="grid gap-4 sm:grid-cols-3">
            <AtsScoreCard
              label="ATS Score"
              score={analysis.atsScore ?? 0}
              description="How well your resume passes ATS filters"
            />
            <AtsScoreCard
              label="Resume Score"
              score={analysis.resumeScore ?? 0}
              description="Overall quality and impact of your resume"
            />
            <AtsScoreCard
              label="Skill Match"
              score={Math.round(analysis.skillMatchPct ?? 0)}
              description="Percentage of required skills you have"
              suffix="%"
            />
          </div>
          {}
          <Tabs defaultValue="overview">
            <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="recommendations">Suggestions</TabsTrigger>
              <TabsTrigger value="interview">Interview</TabsTrigger>
              <TabsTrigger value="rewrite">Rewrites</TabsTrigger>
              <TabsTrigger value="career">Career Path</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              {analysis.atsBreakdown && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: "Keyword Match", value: analysis.atsBreakdown.keywordScore },
                    { label: "Formatting", value: analysis.atsBreakdown.formattingScore },
                    { label: "Sections", value: analysis.atsBreakdown.sectionsScore },
                    { label: "Readability", value: analysis.atsBreakdown.readabilityScore },
                    { label: "Experience", value: analysis.atsBreakdown.experienceScore },
                  ].map((item) => (
                    <AtsScoreCard
                      key={item.label}
                      label={item.label}
                      score={item.value}
                      compact
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="skills" className="mt-4">
              <SkillsPanel
                matched={analysis.matchedSkills}
                missing={analysis.missingSkills}
              />
            </TabsContent>
            <TabsContent value="recommendations" className="mt-4">
              <RecommendationsPanel recommendations={analysis.recommendations} />
            </TabsContent>
            <TabsContent value="interview" className="mt-4">
              <InterviewQuestionsPanel questions={analysis.interviewQuestions} />
            </TabsContent>
            <TabsContent value="rewrite" className="mt-4">
              <RewriteSuggestionsPanel suggestions={analysis.rewriteSuggestions} />
            </TabsContent>
            <TabsContent value="career" className="mt-4">
              <CareerRecommendationsPanel
                recommendations={analysis.careerRecommendations}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
