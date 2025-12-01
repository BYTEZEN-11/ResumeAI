"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { InterviewQuestion } from "@/types";
const difficultyVariant = (d: string): "success" | "warning" | "destructive" => {
  if (d === "easy") return "success";
  if (d === "medium") return "warning";
  return "destructive";
};
const categoryColor = (c: string) => {
  switch (c) {
    case "technical": return "text-blue-500 bg-blue-500/10";
    case "behavioral": return "text-purple-500 bg-purple-500/10";
    case "situational": return "text-orange-500 bg-orange-500/10";
    default: return "text-green-500 bg-green-500/10";
  }
};
function QuestionCard({ q }: { q: InterviewQuestion }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium leading-relaxed">{q.question}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor(q.category)}`}>
              {q.category}
            </span>
            <Badge variant={difficultyVariant(q.difficulty)} className="text-xs">
              {q.difficulty}
            </Badge>
          </div>
        </div>
        {q.hint && (
          <div className="mt-3">
            <button
              onClick={() => setShowHint(!showHint)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Lightbulb className="h-3 w-3" />
              {showHint ? "Hide hint" : "Show hint"}
              {showHint ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showHint && (
              <div className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                {q.hint}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export function InterviewQuestionsPanel({ questions }: { questions: InterviewQuestion[] }) {
  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">No interview questions generated.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {questions.length} questions tailored to your resume and the job description.
      </p>
      {questions.map((q) => (
        <QuestionCard key={q.id} q={q} />
      ))}
    </div>
  );
}
