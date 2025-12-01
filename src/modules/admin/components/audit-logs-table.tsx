"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Shield, Download } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { apiFetch } from "@/shared/hooks/use-api";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { usePagination } from "@/shared/hooks/use-pagination";
import { formatDate } from "@/lib/utils";
type AuditLog = {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string | null; email: string } | null;
};
type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};
const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-500/10 text-green-600 border-green-500/20",
  READ: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  UPDATE: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
  LOGIN: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  LOGOUT: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  UPLOAD: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  ANALYZE: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  EXPORT: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  ADMIN_ACTION: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};
const ALL_ACTIONS = [
  "CREATE", "READ", "UPDATE", "DELETE",
  "LOGIN", "LOGOUT", "UPLOAD", "ANALYZE", "EXPORT", "ADMIN_ACTION",
];
const ALL_RESOURCES = [
  "Resume", "ResumeAnalysis", "JobDescription",
  "User", "FeatureFlag", "AuditLog",
];
export function AuditLogsTable() {
  const [userIdFilter, setUserIdFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const debouncedUserId = useDebounce(userIdFilter, 400);
  const { page, pageSize, goToPage, resetPage } = usePagination({ initialPageSize: 50 });
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(debouncedUserId && { userId: debouncedUserId }),
    ...(actionFilter !== "all" && { action: actionFilter }),
    ...(resourceFilter !== "all" && { resource: resourceFilter }),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", debouncedUserId, actionFilter, resourceFilter, page],
    queryFn: () => apiFetch<AuditLog[]>(`/api/v1/admin/audit-logs?${params}`),
  });
  const logs = data?.data ?? [];
  const meta = data?.meta as PaginationMeta | undefined;
  function handleActionChange(val: string) {
    setActionFilter(val);
    resetPage();
  }
  function handleResourceChange(val: string) {
    setResourceFilter(val);
    resetPage();
  }
  function downloadCsv() {
    if (logs.length === 0) return;
    const headers = ["Date", "User", "Email", "Action", "Resource", "Resource ID", "IP Address"];
    const rows = logs.map((l) => [
      formatDate(l.createdAt),
      l.user?.name ?? "—",
      l.user?.email ?? "—",
      l.action,
      l.resource,
      l.resourceId ?? "—",
      l.ipAddress ?? "—",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-4">
      {}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by User ID..."
            value={userIdFilter}
            onChange={(e) => {
              setUserIdFilter(e.target.value);
              resetPage();
            }}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={handleActionChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ALL_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resourceFilter} onValueChange={handleResourceChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All resources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All resources</SelectItem>
            {ALL_RESOURCES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={downloadCsv} disabled={logs.length === 0}>
          <Download className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
        {meta && (
          <p className="text-xs text-muted-foreground ml-auto">
            {meta.total.toLocaleString()} total events
          </p>
        )}
      </div>
      {}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-semibold">No audit logs found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                    User
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                    Resource
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                    Resource ID
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(log.createdAt, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div>
                          <p className="font-medium text-xs">{log.user.name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                          ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">
                      {log.resource}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono max-w-[140px] truncate">
                      {log.resourceId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {log.ipAddress ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Page {meta.page} of {meta.totalPages} · {meta.total.toLocaleString()} events
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(meta.page - 1)}
                  disabled={!meta.hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(meta.page + 1)}
                  disabled={!meta.hasNextPage}
                >
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
