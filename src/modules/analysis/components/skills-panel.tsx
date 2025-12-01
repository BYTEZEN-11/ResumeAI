import { CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { MatchedSkill, MissingSkill } from "@/types";
type Props = {
  matched: MatchedSkill[];
  missing: MissingSkill[];
};
export function SkillsPanel({ matched, missing }: Props) {
  const critical = missing.filter((s) => s.importance === "critical");
  const important = missing.filter((s) => s.importance === "important");
  const niceToHave = missing.filter((s) => s.importance === "nice-to-have");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Matched Skills ({matched.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matched.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matched skills found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {matched.map((s) => (
                <Badge key={s.id} variant="success" className="text-xs">
                  {s.skill}
                  {s.proficiency && (
                    <span className="ml-1 opacity-70">· {s.proficiency}</span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <XCircle className="h-4 w-4 text-red-500" />
            Missing Skills ({missing.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {missing.length === 0 ? (
            <p className="text-sm text-muted-foreground">No missing skills — great match!</p>
          ) : (
            <>
              {critical.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">
                    Critical
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {critical.map((s) => (
                      <Badge key={s.id} variant="destructive" className="text-xs">
                        {s.skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {important.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-yellow-500 uppercase tracking-wide mb-2">
                    Important
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {important.map((s) => (
                      <Badge key={s.id} variant="warning" className="text-xs">
                        {s.skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {niceToHave.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Nice to Have
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {niceToHave.map((s) => (
                      <Badge key={s.id} variant="secondary" className="text-xs">
                        {s.skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
