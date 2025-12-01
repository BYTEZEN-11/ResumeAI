"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import type { TopMissingSkill } from "@/types";
export function MissingSkillsChart({ data }: { data: TopMissingSkill[] }) {
  const max = data[0]?.count ?? 1;
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Top Missing Skills</CardTitle>
        <CardDescription>Skills you need most across all analyses</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.skill} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate max-w-[160px]">{item.skill}</span>
                  <span className="text-muted-foreground text-xs">{item.count}x</span>
                </div>
                <Progress
                  value={Math.round((item.count / max) * 100)}
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
