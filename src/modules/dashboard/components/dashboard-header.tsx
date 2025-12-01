import Link from "next/link";
import { Sparkles, Download } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
export function DashboardHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Good to see you, {name} 👋</h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your resume performance.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <a href="/api/v1/dashboard/export">
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
        <Button size="sm" asChild>
          <Link href="/analyze">
            <Sparkles className="h-4 w-4" />
            New Analysis
          </Link>
        </Button>
      </div>
    </div>
  );
}
