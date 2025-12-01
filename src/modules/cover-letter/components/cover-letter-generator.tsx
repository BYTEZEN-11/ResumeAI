"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, Sparkles, Loader2, Copy, Check,
  Download, RefreshCw, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
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
import type { Resume, JobDescription } from "@/types";
type GenerateResult = {
  coverLetter: string;
  jobTitle: string;
  company: string;
  tone: string;
  wordCount: number;
};
const TONE_OPTIONS = [
  {
    value: "professional",
    label: "Professional",
    desc: "Formal and polished — best for corporate roles",
  },
  {
    value: "enthusiastic",
    label: "Enthusiastic",
    desc: "Energetic and passionate — best for startups",
  },
  {
    value: "concise",
    label: "Concise",
    desc: "Short and direct — best for busy hiring managers",
  },
];
export function CoverLetterGenerator() {
  const [resumeId, setResumeId] = useState("");
  const [jobDescId, setJobDescId] = useState("");
  const [tone, setTone] = useState<"professional" | "enthusiastic" | "concise">(
    "professional"
  );
  const [customNote, setCustomNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [editedLetter, setEditedLetter] = useState("");
  const [copied, setCopied] = useState(false);
  const { data: resumesData } = useQuery({
    queryKey: ["resumes-select"],
    queryFn: () => apiFetch<Resume[]>("/api/v1/resumes?pageSize=50"),
  });
  const { data: jdsData } = useQuery({
    queryKey: ["job-descriptions-select"],
    queryFn: () => apiFetch<JobDescription[]>("/api/v1/job-descriptions?pageSize=50"),
  });
  const resumes = resumesData?.data ?? [];
  const jobDescs = jdsData?.data ?? [];
  async function generate() {
    if (!resumeId || !jobDescId) {
      toast.error("Please select both a resume and a job description");
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const res = await apiFetch<GenerateResult>("/api/v1/cover-letter", {
        method: "POST",
        body: JSON.stringify({ resumeId, jobDescriptionId: jobDescId, tone, customNote }),
      });
      if (!res.data) throw new Error("No data returned");
      setResult(res.data);
      setEditedLetter(res.data.coverLetter);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }
  async function copyToClipboard() {
    await navigator.clipboard.writeText(editedLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  }
  function downloadTxt() {
    const filename = result
      ? `cover-letter-${result.company || "company"}-${result.jobTitle}`
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "") + ".txt"
      : "cover-letter.txt";
    const blob = new Blob([editedLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  }
  const wordCount = editedLetter.split(/\s+/).filter(Boolean).length;
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="h-4 w-4 text-primary" />
              Configure
            </CardTitle>
            <CardDescription>
              Select your resume and target job, then generate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {}
            <div className="space-y-1.5">
              <Label>Resume</Label>
              {resumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No resumes.{" "}
                  <a href="/resumes" className="text-primary hover:underline">
                    Upload one first.
                  </a>
                </p>
              ) : (
                <Select value={resumeId} onValueChange={setResumeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a resume..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{r.title}</span>
                          <span className="text-xs text-muted-foreground">
                            v{r.version}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {}
            <div className="space-y-1.5">
              <Label>Job Description</Label>
              {jobDescs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No job descriptions.{" "}
                  <a href="/analyze" className="text-primary hover:underline">
                    Add one first.
                  </a>
                </p>
              ) : (
                <Select value={jobDescId} onValueChange={setJobDescId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {jobDescs.map((jd) => (
                      <SelectItem key={jd.id} value={jd.id}>
                        <div>
                          <span className="font-medium">{jd.title}</span>
                          {jd.company && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              @ {jd.company}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {}
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <div className="space-y-2">
                {TONE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setTone(opt.value as typeof tone)
                    }
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      tone === opt.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{opt.label}</span>
                      {tone === opt.value && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
            {}
            <div className="space-y-1.5">
              <Label htmlFor="custom-note">
                Special note{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="custom-note"
                placeholder="e.g. Mention my open source contribution, or reference the company's recent product launch..."
                rows={3}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="resize-none text-sm"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {customNote.length}/500
              </p>
            </div>
            <Button
              className="w-full"
              onClick={generate}
              disabled={generating || !resumeId || !jobDescId}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {result ? "Regenerate" : "Generate Cover Letter"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
      {}
      <div className="lg:col-span-3">
        {generating ? (
          <Card className="h-full min-h-[400px]">
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
              <div className="h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <div className="text-center space-y-1">
                <p className="font-semibold">Writing your cover letter...</p>
                <p className="text-sm text-muted-foreground">
                  AI is crafting a tailored letter. This takes ~10 seconds.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : result ? (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    Cover Letter — {result.jobTitle}
                    {result.company && ` @ ${result.company}`}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {result.tone}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {wordCount} words
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generate}
                    disabled={generating}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadTxt}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedLetter}
                onChange={(e) => setEditedLetter(e.target.value)}
                className="min-h-[420px] text-sm leading-relaxed resize-none font-sans"
                placeholder="Your cover letter will appear here..."
              />
              <p className="text-xs text-muted-foreground mt-2">
                You can edit the letter directly above before copying or downloading.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="min-h-[400px]">
            <CardContent className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="font-semibold">Ready to generate</h3>
                <p className="text-sm text-muted-foreground">
                  Select your resume and job description on the left, choose a tone,
                  and click Generate.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {["Tailored to JD", "ATS-friendly keywords", "Editable output", "Download as .txt"].map(
                  (f) => (
                    <span
                      key={f}
                      className="border rounded-full px-2.5 py-0.5"
                    >
                      {f}
                    </span>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
