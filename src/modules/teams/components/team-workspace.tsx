"use client";
import { useQuery } from "@tanstack/react-query";
import { Users, Sparkles, TrendingUp, Loader2, ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { apiFetch } from "@/shared/hooks/use-api";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
type Team = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  members: {
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
};
type TeamAnalysis = {
  id: string;
  jobTitle: string;
  company: string | null;
  atsScore: number | null;
  status: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
};
type BillingData = {
  subscription: { plan: string } | null;
};
export function TeamWorkspace() {
  const { data: session } = useSession();
  const { data: billingData } = useQuery({
    queryKey: ["billing"],
    queryFn: () => apiFetch<BillingData>("/api/v1/billing/subscription"),
  });
  const isTeamPlan = billingData?.data?.subscription?.plan === "TEAM";
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => apiFetch<Team | null>("/api/v1/teams"),
    enabled: isTeamPlan,
  });
  const { data: analysesData, isLoading: analysesLoading } = useQuery({
    queryKey: ["team-analyses"],
    queryFn: () => apiFetch<TeamAnalysis[]>("/api/v1/teams/analyses"),
    enabled: isTeamPlan && !!teamData?.data,
  });
  const team = teamData?.data;
  const analyses = analysesData?.data ?? [];

  if (!isTeamPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Team Workspace
          </CardTitle>
          <CardDescription>
            Collaborate with your team. Share analyses and track progress together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-12 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Team plan required</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Upgrade to the Team plan ($49/mo) to create a shared workspace with up to 5 seats
                and collaborate on resume analyses.
              </p>
            </div>
            <Button size="lg" asChild>
              <a href="/billing">Upgrade to Team</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">No team workspace yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Create your team workspace in Settings to start collaborating with up to 5 members.
              </p>
            </div>
            <Button asChild>
              <a href="/settings">Go to Settings</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedAnalyses = analyses.filter((a) => a.status === "COMPLETED");
  const avgScore =
    completedAnalyses.length > 0
      ? Math.round(
          completedAnalyses.reduce((sum, a) => sum + (a.atsScore || 0), 0) /
            completedAnalyses.length
        )
      : 0;
  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - 7);
  const analysesThisWeek = analyses.filter(
    (a) => new Date(a.createdAt) >= thisWeek
  ).length;
  return (
    <div className="space-y-6">
      {}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{team.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                @{team.slug} · {team.members.length} member{team.members.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/settings">Team Settings</a>
            </Button>
          </div>
        </CardContent>
      </Card>
      {}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Analyses</p>
                <p className="text-2xl font-bold mt-1">{analyses.length}</p>
              </div>
              <div className="rounded-xl p-3 bg-purple-500/10">
                <Sparkles className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg ATS Score</p>
                <p className="text-2xl font-bold mt-1">{avgScore}/100</p>
              </div>
              <div className="rounded-xl p-3 bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold mt-1">{analysesThisWeek}</p>
              </div>
              <div className="rounded-xl p-3 bg-blue-500/10">
                <Sparkles className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {team.members.map((member) => {
              const isOwner = member.userId === team.ownerId;
              const isMe = member.userId === session?.user?.id;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(member.user.name ?? member.user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.user.name ?? member.user.email}
                        {isMe && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {isOwner ? "Owner" : member.role}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      {}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Shared Analyses</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/history">
                View all
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {analysesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : analyses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No analyses yet. Team members&apos; analyses will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {analyses.slice(0, 10).map((analysis) => (
                <a
                  key={analysis.id}
                  href={`/history/${analysis.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{analysis.jobTitle}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {analysis.company && (
                        <p className="text-xs text-muted-foreground">{analysis.company}</p>
                      )}
                      <span className="text-xs text-muted-foreground">·</span>
                      <p className="text-xs text-muted-foreground">
                        by {analysis.user.name ?? analysis.user.email.split("@")[0]}
                      </p>
                      <span className="text-xs text-muted-foreground">·</span>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(analysis.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    {analysis.status === "COMPLETED" && analysis.atsScore !== null ? (
                      <Badge
                        variant={
                          analysis.atsScore >= 80
                            ? "default"
                            : analysis.atsScore >= 60
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {analysis.atsScore}/100
                      </Badge>
                    ) : (
                      <Badge variant="outline">{analysis.status}</Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
