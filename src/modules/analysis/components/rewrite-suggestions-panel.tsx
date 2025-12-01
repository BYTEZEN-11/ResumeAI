import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import type { RewriteSuggestion } from "@/types";
export function RewriteSuggestionsPanel({ suggestions }: { suggestions: RewriteSuggestion[] }) {
  if (suggestions.length === 0) {
    return <p className="text-sm text-muted-foreground">No rewrite suggestions generated.</p>;
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        AI-suggested rewrites to strengthen your resume language and impact.
      </p>
      {suggestions.map((s) => (
        <Card key={s.id}>
          <CardContent className="p-5">
            <Badge variant="outline" className="mb-3 text-xs">{s.section}</Badge>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Before</p>
                <p className="text-sm bg-muted/50 rounded-lg p-3 line-through text-muted-foreground">
                  {s.original}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-green-500 uppercase tracking-wide">After</p>
                <p className="text-sm bg-green-500/5 border border-green-500/20 rounded-lg p-3">
                  {s.rewritten}
                </p>
              </div>
            </div>
            {s.explanation && (
              <p className="mt-3 text-xs text-muted-foreground">
                <ArrowRight className="inline h-3 w-3 mr-1" />
                {s.explanation}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
