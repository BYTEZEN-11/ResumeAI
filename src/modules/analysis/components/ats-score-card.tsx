import { Card, CardContent } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { scoreToColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
type Props = {
  label: string;
  score: number;
  description?: string;
  suffix?: string;
  compact?: boolean;
};
export function AtsScoreCard({ label, score, description, suffix = "", compact = false }: Props) {
  return (
    <Card className={cn(compact && "shadow-none border-border/50")}>
      <CardContent className={cn("p-5", compact && "p-4")}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className={cn("font-medium", compact ? "text-xs text-muted-foreground" : "text-sm")}>{label}</p>
            {description && !compact && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <span className={cn("font-bold tabular-nums", scoreToColor(score), compact ? "text-lg" : "text-3xl")}>
            {score}{suffix}
          </span>
        </div>
        <Progress value={score} className={cn("h-1.5", compact && "h-1")} />
        {!compact && (
          <p className="text-xs text-muted-foreground mt-2">
            {score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Needs work" : "Critical issues"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
