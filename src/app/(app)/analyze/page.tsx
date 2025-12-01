import type { Metadata } from "next";
import { AnalyzeForm } from "@/modules/analysis/components/analyze-form";
export const metadata: Metadata = { title: "Analyze Resume" };
export default function AnalyzePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analyze Resume</h1>
        <p className="text-muted-foreground mt-1">
          Match your resume against a job description and get a detailed AI analysis.
        </p>
      </div>
      <AnalyzeForm />
    </div>
  );
}
