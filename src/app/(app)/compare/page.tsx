import type { Metadata } from "next";
import { ScoreComparison } from "@/modules/analysis/components/score-comparison";
export const metadata: Metadata = { title: "Compare Analyses" };
export default function ComparePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Score Comparison</h1>
        <p className="text-muted-foreground mt-1">
          Compare your resume&apos;s ATS scores across multiple job descriptions to find your best fit.
        </p>
      </div>
      <ScoreComparison />
    </div>
  );
}
