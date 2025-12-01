"use client";
"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, ShieldOff, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { apiFetch } from "@/shared/hooks/use-api";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { usePagination } from "@/shared/hooks/use-pagination";
import { formatDate } from "@/lib/utils";
type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  subscription: { plan: string; analysesUsed: number; analysesLimit: number } | null;
  _count: { resumes: number; analyses: number };
};
export function AdminUsersTable() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const debouncedSearch = useDebounce(search, 300);
  const { page, pageSize, goToPage } = usePagination({ initialPageSize: 20 });
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(roleFilter !== "all" && { role: roleFilter }),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch, roleFilter, page],
    queryFn: () => apiFetch<AdminUser[]>(`/api/v1/admin/users?${params}`),
  });
  const users = data?.data ?? [];
  const meta = data?.meta;
  async function toggleBan(userId: string, currentlyBanned: boolean) {
    try {
      await apiFetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          isBanned: !currentlyBanned,
          bannedReason: !currentlyBanned ? "Banned by admin" : undefined,
        }),
      });
      toast.success(currentlyBanned ? "User unbanned" : "User banned");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }
  async function toggleActive(userId: string, currentlyActive: boolean) {
    try {
      await apiFetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentlyActive }),
      });
      toast.success(currentlyActive ? "User deactivated" : "User activated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }
  async function impersonateUser(userId: string, userName: string) {
    try {
      await apiFetch("/api/v1/admin/impersonate", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      toast.success(`Impersonating ${userName}. Redirecting...`);

      window.location.href = "/dashboard";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to impersonate");
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="PRO">Pro</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Usage</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={u.subscription?.plan === "FREE" ? "secondary" : "default"}
                      className="text-xs"
                    >
                      {u.subscription?.plan ?? "FREE"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u._count.resumes} resumes · {u._count.analyses} analyses
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${u.isActive && !u.isBanned ? "bg-green-500" : "bg-red-500"}`} />
                      <span className="text-xs text-muted-foreground">
                        {u.isBanned ? "Banned" : u.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleActive(u.id, u.isActive)}
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      {isSuperAdmin && !u.isBanned && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-orange-500"
                          onClick={() => impersonateUser(u.id, u.name ?? u.email)}
                          title="Impersonate user"
                        >
                          <UserCog className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${u.isBanned ? "text-green-500" : "text-destructive"}`}
                        onClick={() => toggleBan(u.id, u.isBanned)}
                      >
                        {u.isBanned ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                {meta.total} users · Page {meta.page} of {meta.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => goToPage(meta.page - 1)} disabled={!meta.hasPrevPage}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => goToPage(meta.page + 1)} disabled={!meta.hasNextPage}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
