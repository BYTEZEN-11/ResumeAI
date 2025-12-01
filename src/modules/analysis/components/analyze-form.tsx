"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Sparkles, FileText, Loader2, Link2, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { apiFetch } from "@/shared/hooks/use-api";
import type { Resume } from "@/types";
const schema = z.object({
  resumeId: z.string().min(1, "Please select a resume"),
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().optional(),
  jobDescription: z
    .string()
    .min(50, "Job description must be at least 50 characters")
    .max(10000),
});
type FormValues = z.infer<typeof schema>;
type FetchedJob = {
  title: string;
  company: string;
  description: string;
  url: string;
};
export function AnalyzeForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlFetching, setUrlFetching] = useState(false);
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { resumeId: "", jobTitle: "", company: "", jobDescription: "" },
  });
  const { data: resumesData } = useQuery({
    queryKey: ["resumes-select"],
    queryFn: () => apiFetch<Resume[]>("/api/v1/resumes?pageSize=50"),
  });
  const resumes = resumesData?.data ?? [];

  async function handleFetchUrl() {
    const url = urlInput.trim();
    if (!url) return;

    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL (e.g. https://example.com/job)");
      return;
    }
    setUrlFetching(true);
    try {
      const res = await apiFetch<FetchedJob>("/api/v1/job-descriptions/fetch-url", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      if (!res.data) throw new Error("No data returned");
      const { title, company, description } = res.data;
      form.setValue("jobTitle", title, { shouldValidate: true });
      form.setValue("company", company, { shouldValidate: true });
      form.setValue("jobDescription", description, { shouldValidate: true });
      setFetchedUrl(url);
      setUrlInput("");
      toast.success("Job description fetched! Review and edit if needed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch URL");
    } finally {
      setUrlFetching(false);
    }
  }
  function clearFetchedUrl() {
    setFetchedUrl(null);
    form.setValue("jobTitle", "");
    form.setValue("company", "");
    form.setValue("jobDescription", "");
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const jdRes = await apiFetch<{ id: string }>("/api/v1/job-descriptions", {
        method: "POST",
        body: JSON.stringify({
          title: values.jobTitle,
          company: values.company || undefined,
          description: values.jobDescription,
          url: fetchedUrl || undefined,
        }),
      });
      if (!jdRes.data?.id) throw new Error("Failed to save job description");
      const analysisRes = await apiFetch<{ id: string; status: string }>(
        "/api/v1/analyses",
        {
          method: "POST",
          body: JSON.stringify({
            resumeId: values.resumeId,
            jobDescriptionId: jdRes.data.id,
          }),
        }
      );
      if (!analysisRes.data?.id) throw new Error("Failed to start analysis");
      toast.success("Analysis queued! You'll be notified when it's ready.");
      router.push(`/history/${analysisRes.data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Select Resume
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {resumes.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No resumes found.{" "}
                <a href="/resumes" className="text-primary hover:underline">
                  Upload one first.
                </a>
              </p>
            </div>
          ) : (
            <div>
              <Label>Resume</Label>
              <Select
                onValueChange={(v) => form.setValue("resumeId", v)}
                value={form.watch("resumeId")}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a resume..." />
                </SelectTrigger>
                <SelectContent>
                  {resumes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="font-medium">{r.title}</span>
                      <span className="ml-2 text-muted-foreground text-xs">
                        v{r.version} · {r.fileType}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.resumeId && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.resumeId.message}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Job Description
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {}
          <div className="space-y-2">
            <Label>
              Import from URL
              <Badge variant="secondary" className="ml-2 text-xs py-0">New</Badge>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="https://example.com/careers/job/123"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFetchUrl();
                    }
                  }}
                  disabled={urlFetching}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleFetchUrl}
                disabled={urlFetching || !urlInput.trim()}
                className="shrink-0"
              >
                {urlFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Fetch"
                )}
              </Button>
            </div>
            {}
            {fetchedUrl && (
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <p className="text-xs text-green-600 dark:text-green-400 flex-1 truncate">
                  Fetched from: {fetchedUrl}
                </p>
                <button
                  type="button"
                  onClick={clearFetchedUrl}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Clear fetched data"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or fill manually</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
          {}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                placeholder="e.g. Senior Software Engineer"
                {...form.register("jobTitle")}
              />
              {form.formState.errors.jobTitle && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.jobTitle.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company (optional)</Label>
              <Input
                id="company"
                placeholder="e.g. Google"
                {...form.register("company")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jobDescription">Job Description *</Label>
            <Textarea
              id="jobDescription"
              placeholder="Paste the full job description here, or use the URL import above..."
              rows={10}
              {...form.register("jobDescription")}
              className="resize-none font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              {form.formState.errors.jobDescription ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.jobDescription.message}
                </p>
              ) : (
                <span />
              )}
              <p className="text-xs text-muted-foreground">
                {form.watch("jobDescription")?.length ?? 0} chars
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Button
        type="submit"
        size="lg"
        disabled={loading || resumes.length === 0}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Run Analysis
          </>
        )}
      </Button>
    </form>
  );
}
