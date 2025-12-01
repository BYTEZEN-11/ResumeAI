import type { Metadata } from "next";
import { BulkAnalysis } from "@/modules/analysis/components/bulk-analysis";
export const metadata: Metadata = { title: "Bulk Analysis" };
export default function BulkAnalyzePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Analyze your resume against multiple job descriptions at once. Results appear in History.
        </p>
      </div>
      <BulkAnalysis />
    </div>
  );
}
