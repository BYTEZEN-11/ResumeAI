import type { Metadata } from "next";
import { HistoryList } from "@/modules/analysis/components/history-list";
export const metadata: Metadata = { title: "Analysis History" };
export default function HistoryPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analysis History</h1>
        <p className="text-muted-foreground mt-1">
          All your resume analyses, searchable and filterable.
        </p>
      </div>
      <HistoryList />
    </div>
  );
}
