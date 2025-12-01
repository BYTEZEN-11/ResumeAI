import Link from "next/link";
import { ArrowRight, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatRelativeTime, scoreToColor } from "@/lib/utils";
type RecentAnalysis = {
  id: string;
  status: string;
  atsScore: number | null;
  jobTitle: string | null;
  company: string | null;
  createdAt: Date;
  resume: { title: string };
  jobDescription: { title: string; company: string | null };
};
export function RecentAnalyses({ analyses }: { analyses: RecentAnalysis[] }) {
  const statusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED": return <XCircle className="h-4 w-4 text-red-500" />;
      case "PROCESSING": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };
  const statusBadge = (status: string) => {
    const map: Record<string, "success" | "destructive" | "info" | "secondary"> = {
      COMPLETED: "success",
      FAILED: "destructive",
      PROCESSING: "info",
      PENDING: "secondary",
    };
    return map[status] ?? "secondary";
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Analyses</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/history">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-muted-foreground">No analyses yet.</p>
            <Button size="sm" className="mt-3" asChild>
              <Link href="/analyze">Start your first analysis</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {analyses.map((analysis) => (
              <Link
                key={analysis.id}
                href={`/history/${analysis.id}`}
                className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(analysis.status)}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {analysis.jobDescription.title}
                      {analysis.jobDescription.company && (
                        <span className="text-muted-foreground font-normal">
                          {" "}@ {analysis.jobDescription.company}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {analysis.resume.title} · {formatRelativeTime(analysis.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {analysis.atsScore !== null && (
                    <span className={`text-sm font-bold ${scoreToColor(analysis.atsScore)}`}>
                      {analysis.atsScore}
                    </span>
                  )}
                  <Badge variant={statusBadge(analysis.status)} className="text-xs">
                    {analysis.status.toLowerCase()}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
