import { AlertTriangle, ArrowUp, Plus, Minus, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { Recommendation } from "@/types";
const typeIcon = (type: string) => {
  switch (type) {
    case "improve": return <ArrowUp className="h-4 w-4 text-blue-500" />;
    case "add": return <Plus className="h-4 w-4 text-green-500" />;
    case "remove": return <Minus className="h-4 w-4 text-red-500" />;
    case "rewrite": return <RefreshCw className="h-4 w-4 text-purple-500" />;
    default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  }
};
const priorityVariant = (p: string): "destructive" | "warning" | "secondary" => {
  if (p === "high") return "destructive";
  if (p === "medium") return "warning";
  return "secondary";
};
export function RecommendationsPanel({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return <p className="text-sm text-muted-foreground">No recommendations generated.</p>;
  }
  return (
    <div className="space-y-3">
      {recommendations.map((rec) => (
        <Card key={rec.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{typeIcon(rec.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{rec.title}</span>
                  <Badge variant="outline" className="text-xs">{rec.section}</Badge>
                  <Badge variant={priorityVariant(rec.priority)} className="text-xs">
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
                {rec.example && (
                  <div className="mt-2 rounded-md bg-muted px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Example:</p>
                    <p className="text-xs font-mono">{rec.example}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
