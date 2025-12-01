"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, Trash2, LogOut, Crown, Loader2, UserX } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { apiFetch } from "@/shared/hooks/use-api";
type TeamMemberUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
};
type TeamMember = {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: TeamMemberUser;
};
type Team = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  owner: TeamMemberUser;
  members: TeamMember[];
};
type BillingData = {
  subscription: { plan: string } | null;
};
export function TeamPanel() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
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
  const team = teamData?.data;
  const isOwner = team?.ownerId === session?.user?.id;
  const memberCount = team?.members?.length ?? 0;
  async function createTeam() {
    if (!teamName.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/v1/teams", {
        method: "POST",
        body: JSON.stringify({ name: teamName.trim() }),
      });
      toast.success("Team created!");
      setCreateOpen(false);
      setTeamName("");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create team");
    } finally {
      setSaving(false);
    }
  }
  async function inviteMember() {
    if (!inviteEmail.trim() || !team) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/teams/${team.id}/members`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      toast.success("Member invited and notified via email!");
      setInviteOpen(false);
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to invite member");
    } finally {
      setSaving(false);
    }
  }
  async function removeMember(memberId: string, memberName: string) {
    if (!team) return;
    setRemovingId(memberId);
    try {
      await apiFetch(`/api/v1/teams/${team.id}/members/${memberId}`, {
        method: "DELETE",
      });
      toast.success(`${memberName} removed from team`);
      queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  }
  async function leaveTeam() {
    if (!team) return;
    const myMember = team.members.find((m) => m.userId === session?.user?.id);
    if (!myMember) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/teams/${team.id}/members/${myMember.id}`, {
        method: "DELETE",
      });
      toast.success("You have left the team");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to leave team");
    } finally {
      setSaving(false);
    }
  }
  async function deleteTeam() {
    if (!team) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/teams/${team.id}`, { method: "DELETE" });
      toast.success("Team deleted");
      setDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["team"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete team");
    } finally {
      setSaving(false);
    }
  }

  if (!isTeamPlan) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Team Workspace</CardTitle>
          </div>
          <CardDescription>
            Collaborate with your team. Share analyses, track progress together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-7 w-7 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">Team plan required</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Upgrade to the Team plan ($49/mo) to create a shared workspace with up to 5 seats.
              </p>
            </div>
            <Button asChild>
              <a href="/billing">Upgrade to Team</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!team) {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Team Workspace</CardTitle>
            </div>
            <CardDescription>
              Create your team workspace to collaborate with up to 5 members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-dashed p-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-7 w-7 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">No team yet</h3>
                <p className="text-sm text-muted-foreground">
                  Create a team workspace to start collaborating.
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)}>
                <Users className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </div>
          </CardContent>
        </Card>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team Workspace</DialogTitle>
              <DialogDescription>
                Give your team a name. You can invite up to 4 other members.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  placeholder="e.g. Acme Corp Hiring Team"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && createTeam()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createTeam} disabled={saving || !teamName.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Team"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription className="mt-0.5">
                  {memberCount} / 5 members · @{team.slug}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwner && memberCount < 5 && (
                <Button size="sm" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Invite
                </Button>
              )}
              {isOwner ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Team
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={leaveTeam} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-1.5" />
                      Leave
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {}
          <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Seats used</span>
              <span className="font-medium">{memberCount} / 5</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(memberCount / 5) * 100}%` }}
              />
            </div>
          </div>
          {}
          <div className="divide-y rounded-xl border overflow-hidden">
            {team.members.map((member) => {
              const isThisOwner = member.userId === team.ownerId;
              const isMe = member.userId === session?.user?.id;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-4 py-3 bg-background"
                >
                  <div className="flex items-center gap-3">
                    {}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {(member.user.name ?? member.user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {member.user.name ?? member.user.email}
                          {isMe && (
                            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                          )}
                        </p>
                        {isThisOwner && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {isThisOwner ? "Owner" : "Member"}
                    </Badge>
                    {}
                    {isOwner && !isThisOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() =>
                          removeMember(member.id, member.user.name ?? member.user.email)
                        }
                        disabled={removingId === member.id}
                      >
                        {removingId === member.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <UserX className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {memberCount < 5 && isOwner && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              {5 - memberCount} seat{5 - memberCount !== 1 ? "s" : ""} available
            </p>
          )}
        </CardContent>
      </Card>
      {}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Enter their email address. They must already have a ResumeRank AI account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && inviteMember()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={inviteMember} disabled={saving || !inviteEmail.trim()}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>&ldquo;{team.name}&rdquo;</strong> and remove all{" "}
              {memberCount} members. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteTeam} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
