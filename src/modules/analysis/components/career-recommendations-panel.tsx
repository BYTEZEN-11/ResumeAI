"use client";
import { TrendingUp, Clock, BookOpen, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { CareerRecommendation } from "@/types";
export function CareerRecommendationsPanel({
  recommendations,
}: {
  recommendations: CareerRecommendation[];
}) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No career recommendations generated.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        AI-powered career path recommendations based on your resume and the target role.
      </p>
      {recommendations.map((rec, idx) => (
        <Card key={rec.id ?? idx} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">{rec.title}</CardTitle>
              </div>
              {rec.timeline && (
                <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{rec.timeline}</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {rec.description}
            </p>
            {rec.skillsToAdd && rec.skillsToAdd.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <BookOpen className="h-3.5 w-3.5" />
                  Skills to Develop
                </div>
                <div className="flex flex-wrap gap-2">
                  {rec.skillsToAdd.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                    >
                      <ChevronRight className="h-3 w-3" />
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
