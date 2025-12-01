"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search, Filter, Trash2, Eye,
  CheckCircle, XCircle, Loader2, Clock
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { apiFetch } from "@/shared/hooks/use-api";
import { useDebounce } from "@/shared/hooks/use-debounce";
import { usePagination } from "@/shared/hooks/use-pagination";
import { formatRelativeTime, scoreToColor } from "@/lib/utils";
import type { AnalysisWithRelations } from "@/types";
export function HistoryList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const debouncedSearch = useDebounce(search, 300);
  const { page, pageSize, goToPage } = usePagination();
  const queryClient = useQueryClient();
  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["analyses", debouncedSearch, statusFilter, page],
    queryFn: () =>
      apiFetch<AnalysisWithRelations[]>(`/api/v1/analyses?${queryParams}`),
  });
  const analyses = data?.data ?? [];
  const meta = data?.meta;
  async function deleteAnalysis(id: string) {
    try {
      await apiFetch(`/api/v1/analyses/${id}`, { method: "DELETE" });
      toast.success("Analysis deleted");
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }
  const statusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED": return <XCircle className="h-4 w-4 text-red-500" />;
      case "PROCESSING": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };
  return (
    <div className="space-y-4">
      {}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by job title or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="PROCESSING">Processing</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="font-semibold">No analyses found</h3>
          <p className="text-muted-foreground mt-1">
            {search ? "Try a different search term" : "Run your first analysis to see results here."}
          </p>
          <Button size="sm" className="mt-4" asChild>
            <Link href="/analyze">Start Analysis</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Resume</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ATS Score</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {analyses.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(a.status)}
                      <span className="capitalize text-xs text-muted-foreground">
                        {a.status.toLowerCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[200px]">
                      {a.jobDescription?.title ?? a.jobTitle ?? "—"}
                    </p>
                    {(a.jobDescription?.company ?? a.company) && (
                      <p className="text-xs text-muted-foreground">
                        {a.jobDescription?.company ?? a.company}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[160px] truncate">
                    {a.resume?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {a.atsScore !== null ? (
                      <span className={`font-bold ${scoreToColor(a.atsScore)}`}>
                        {a.atsScore}/100
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatRelativeTime(a.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <Link href={`/history/${a.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => deleteAnalysis(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                {meta.total} results · Page {meta.page} of {meta.totalPages}
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
