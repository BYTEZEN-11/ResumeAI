"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, Sparkles, DollarSign, TrendingUp, Loader2,
  Plus, Trash2, BarChart2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { apiFetch } from "@/shared/hooks/use-api";
type Analytics = {
  totalUsers: number;
  newUsersThisMonth: number;
  userGrowthPct: number;
  totalAnalyses: number;
  analysesThisMonth: number;
  averageAtsScore: number;
  totalRevenue: number;
  activeSubscriptions: number;
  userGrowth: { month: string; count: number }[];
};
type FeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  rolloutPct: number;
};
export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => apiFetch<Analytics>("/api/v1/admin/analytics"),
  });
  const stats = data?.data;
  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  const cards = [
    {
      label: "Total Users",
      value: stats?.totalUsers?.toLocaleString() ?? "—",
      sub: `+${stats?.newUsersThisMonth ?? 0} this month`,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Analyses",
      value: stats?.totalAnalyses?.toLocaleString() ?? "—",
      sub: `${stats?.analysesThisMonth ?? 0} this month`,
      icon: Sparkles,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Revenue",
      value: `$${(stats?.totalRevenue ?? 0).toLocaleString()}`,
      sub: `${stats?.activeSubscriptions ?? 0} active subs`,
      icon: DollarSign,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "Avg ATS Score",
      value: `${stats?.averageAtsScore ?? 0}/100`,
      sub: `${stats?.userGrowthPct ?? 0}% user growth`,
      icon: TrendingUp,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];
  return (
    <div className="space-y-6">
      {}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <p className="mt-1 text-2xl font-bold">{c.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${c.bg}`}>
                    <Icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {}
      {stats?.userGrowth && stats.userGrowth.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">User Growth (Last 12 Months)</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.userGrowth}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  labelFormatter={(l) => `Month: ${l}`}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#userGrad)"
                  name="New Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminUsersList />
        <AdminFeatureFlags />
      </div>
    </div>
  );
}
function AdminUsersList() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-preview"],
    queryFn: () => apiFetch("/api/v1/admin/users?pageSize=5"),
  });
  const users =
    (data?.data as {
      id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
      createdAt: string;
    }[]) ?? [];
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Recent Users</h3>
          <Button variant="ghost" size="sm" asChild>
            <a href="/admin/users">View all</a>
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
        ) : (
          <div className="divide-y">
            {users.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium">{u.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {u.role}
                  </Badge>
                  <div
                    className={`h-2 w-2 rounded-full ${
                      u.isActive ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function AdminFeatureFlags() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newFlag, setNewFlag] = useState({ key: "", name: "", description: "", rolloutPct: 0 });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => apiFetch<FeatureFlag[]>("/api/v1/admin/feature-flags"),
  });
  const flags = data?.data ?? [];
  async function toggleFlag(flag: FeatureFlag) {
    setTogglingId(flag.id);
    try {
      await apiFetch(`/api/v1/admin/feature-flags/${flag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isEnabled: !flag.isEnabled }),
      });
      toast.success(`"${flag.name}" ${!flag.isEnabled ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update flag");
    } finally {
      setTogglingId(null);
    }
  }
  async function deleteFlag(flag: FeatureFlag) {
    try {
      await apiFetch(`/api/v1/admin/feature-flags/${flag.id}`, { method: "DELETE" });
      toast.success(`"${flag.name}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete flag");
    }
  }
  async function createFlag() {
    if (!newFlag.key || !newFlag.name) {
      toast.error("Key and Name are required");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/v1/admin/feature-flags", {
        method: "POST",
        body: JSON.stringify({
          key: newFlag.key,
          name: newFlag.name,
          description: newFlag.description || undefined,
          rolloutPct: Number(newFlag.rolloutPct),
          isEnabled: false,
        }),
      });
      toast.success("Feature flag created");
      setCreateOpen(false);
      setNewFlag({ key: "", name: "", description: "", rolloutPct: 0 });
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create flag");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Feature Flags</h3>
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Flag
            </Button>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : flags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No feature flags. Create one to get started.
            </p>
          ) : (
            <div className="divide-y">
              {flags.map((f) => (
                <div key={f.id} className="flex items-center justify-between px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">{f.key}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {f.rolloutPct > 0 && f.rolloutPct < 100 && (
                      <span className="text-xs text-muted-foreground">{f.rolloutPct}%</span>
                    )}
                    {}
                    <button
                      onClick={() => toggleFlag(f)}
                      disabled={togglingId === f.id}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 ${
                        f.isEnabled ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                      aria-label={f.isEnabled ? "Disable flag" : "Enable flag"}
                    >
                      {togglingId === f.id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-white absolute left-1" />
                      ) : (
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            f.isEnabled ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-destructive"
                      onClick={() => deleteFlag(f)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="flag-key">Key</Label>
              <Input
                id="flag-key"
                placeholder="e.g. new_dashboard_ui"
                value={newFlag.key}
                onChange={(e) =>
                  setNewFlag((p) => ({
                    ...p,
                    key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">Lowercase letters, numbers, underscores only</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flag-name">Name</Label>
              <Input
                id="flag-name"
                placeholder="e.g. New Dashboard UI"
                value={newFlag.name}
                onChange={(e) => setNewFlag((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flag-desc">Description (optional)</Label>
              <Input
                id="flag-desc"
                placeholder="What does this flag control?"
                value={newFlag.description}
                onChange={(e) => setNewFlag((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="flag-rollout">Rollout % (0 = off, 100 = everyone)</Label>
              <Input
                id="flag-rollout"
                type="number"
                min={0}
                max={100}
                value={newFlag.rolloutPct}
                onChange={(e) =>
                  setNewFlag((p) => ({ ...p, rolloutPct: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFlag} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
