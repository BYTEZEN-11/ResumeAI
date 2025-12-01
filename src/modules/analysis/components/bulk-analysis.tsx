"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Layers, FileText, CheckCircle2, Loader2,
  Sparkles, AlertTriangle, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { apiFetch } from "@/shared/hooks/use-api";
import type { Resume, JobDescription, Subscription } from "@/types";
const MAX_BULK = 10;
type BulkResult = {
  queued: number;
  analysisIds: string[];
  resumeTitle: string;
};
type BillingData = {
  subscription: Subscription | null;
};
export function BulkAnalysis() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [resumeId, setResumeId] = useState("");
  const [selectedJdIds, setSelectedJdIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: resumesData } = useQuery({
    queryKey: ["resumes-select"],
    queryFn: () => apiFetch<Resume[]>("/api/v1/resumes?pageSize=50"),
  });
  const { data: jdsData } = useQuery({
    queryKey: ["job-descriptions-bulk"],
    queryFn: () => apiFetch<JobDescription[]>("/api/v1/job-descriptions?pageSize=50"),
  });
  const { data: billingData } = useQuery({
    queryKey: ["billing"],
    queryFn: () => apiFetch<BillingData>("/api/v1/billing/subscription"),
  });
  const resumes = resumesData?.data ?? [];
  const jobDescs = jdsData?.data ?? [];
  const subscription = billingData?.data?.subscription;
  const isFree = subscription?.plan === "FREE";
  const remaining = isFree
    ? Math.max(0, (subscription?.analysesLimit ?? 3) - (subscription?.analysesUsed ?? 0))
    : MAX_BULK;
  const maxSelect = Math.min(MAX_BULK, remaining);
  function toggleJd(id: string) {
    setSelectedJdIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= maxSelect) {
        toast.error(
          isFree
            ? `Only ${remaining} analyses remaining. Upgrade for more.`
            : `Maximum ${MAX_BULK} at once`
        );
        return prev;
      }
      return [...prev, id];
    });
  }
  function selectAll() {
    const ids = jobDescs.slice(0, maxSelect).map((j) => j.id);
    setSelectedJdIds(ids);
  }
  async function submit() {
    if (!resumeId) { toast.error("Select a resume first"); return; }
    if (selectedJdIds.length < 2) { toast.error("Select at least 2 job descriptions"); return; }
    setSubmitting(true);
    try {
      const res = await apiFetch<BulkResult>("/api/v1/analyses/bulk", {
        method: "POST",
        body: JSON.stringify({ resumeId, jobDescriptionIds: selectedJdIds }),
      });
      if (!res.data) throw new Error("Failed");
      toast.success(
        `${res.data.queued} analyses queued for "${res.data.resumeTitle}". Check History for results.`,
        { duration: 5000 }
      );

      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      router.push("/history");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk analysis failed");
    } finally {
      setSubmitting(false);
    }
  }
  const usagePct = isFree && subscription
    ? Math.min(100, Math.round(((subscription.analysesUsed) / subscription.analysesLimit) * 100))
    : 0;
  return (
    <div className="space-y-6 max-w-3xl">
      {}
      {isFree && subscription && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">
                  Free plan: {subscription.analysesUsed} / {subscription.analysesLimit} analyses used
                </p>
                <Progress value={usagePct} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {remaining > 0
                    ? `You can queue up to ${remaining} more this month.`
                    : "No analyses remaining. Upgrade to Pro for unlimited."}
                </p>
              </div>
              {remaining === 0 && (
                <Button size="sm" asChild>
                  <a href="/billing">Upgrade</a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Step 1 — Choose Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resumes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No resumes.{" "}
              <a href="/resumes" className="text-primary hover:underline">Upload one first.</a>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {resumes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setResumeId(r.id)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    resumeId === r.id
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {r.title}
                  <span className="ml-1.5 text-xs text-muted-foreground">v{r.version}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Step 2 — Select Job Descriptions
              </CardTitle>
              <CardDescription className="mt-1">
                Select 2–{maxSelect} jobs to analyze against your resume simultaneously.
              </CardDescription>
            </div>
            {jobDescs.length > 0 && (
              <Button variant="outline" size="sm" onClick={selectAll} disabled={maxSelect === 0}>
                Select All ({Math.min(jobDescs.length, maxSelect)})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobDescs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No job descriptions saved.{" "}
              <a href="/analyze" className="text-primary hover:underline">Add some first.</a>
            </p>
          ) : (
            <>
              {jobDescs.map((jd) => {
                const isSelected = selectedJdIds.includes(jd.id);
                const isDisabled = !isSelected && selectedJdIds.length >= maxSelect;
                return (
                  <button
                    key={jd.id}
                    onClick={() => !isDisabled && toggleJd(jd.id)}
                    disabled={isDisabled && !isSelected}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-colors flex items-center justify-between gap-3 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : isDisabled
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{jd.title}</p>
                      {jd.company && (
                        <p className="text-xs text-muted-foreground">@ {jd.company}</p>
                      )}
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                  </button>
                );
              })}
              {}
              <div className="pt-3 flex items-center justify-between border-t mt-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {selectedJdIds.length} selected
                  </span>
                  {selectedJdIds.length > 0 && (
                    <button
                      onClick={() => setSelectedJdIds([])}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Button
                  onClick={submit}
                  disabled={
                    submitting ||
                    !resumeId ||
                    selectedJdIds.length < 2 ||
                    remaining === 0
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Queuing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Run {selectedJdIds.length || ""} Analyses
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {}
      <Card className="bg-muted/30">
        <CardContent className="p-5">
          <p className="text-sm font-medium mb-3">How Bulk Analysis works</p>
          <div className="space-y-2">
            {[
              "All analyses are queued instantly and run in parallel",
              "Each job is processed independently — no extra wait",
              "You'll get a notification when each analysis completes",
              "View all results in History, or use Compare to rank them",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {step}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
