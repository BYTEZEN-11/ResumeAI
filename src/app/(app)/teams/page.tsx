import type { Metadata } from "next";
import { TeamWorkspace } from "@/modules/teams/components/team-workspace";
export const metadata: Metadata = { title: "Team Workspace" };
export default function TeamsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Workspace</h1>
        <p className="text-muted-foreground mt-1">
          Collaborate with your team. Share analyses and track progress together.
        </p>
      </div>
      <TeamWorkspace />
    </div>
  );
}
