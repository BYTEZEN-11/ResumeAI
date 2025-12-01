"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, Trash2, Eye, MoreHorizontal, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ResumeUploadDialog } from "./resume-upload-dialog";
import { ResumeReplaceDialog } from "./resume-replace-dialog";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { apiFetch } from "@/shared/hooks/use-api";
import { useDebounce } from "@/shared/hooks/use-debounce";
import type { Resume } from "@/types";
export function ResumeList() {
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<{ id: string; title: string } | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["resumes", debouncedSearch],
    queryFn: () =>
      apiFetch<Resume[]>(
        `/api/v1/resumes?search=${encodeURIComponent(debouncedSearch)}&pageSize=50`
      ),
  });
  const resumes = data?.data ?? [];
  async function deleteResume(id: string) {
    try {
      await apiFetch(`/api/v1/resumes/${id}`, { method: "DELETE" });
      toast.success("Resume deleted");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }
  async function downloadResume(id: string) {
    try {
      const res = await apiFetch<{ url: string }>(`/api/v1/resumes/${id}/download`);
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to get download link");
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resumes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" />
          Upload Resume
        </Button>
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No resumes yet</h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Upload your first resume to get started with AI-powered analysis.
          </p>
          <Button className="mt-4" onClick={() => setUploadOpen(true)}>
            <Plus className="h-4 w-4" />
            Upload Resume
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card key={resume.id} className="group hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{resume.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {resume.fileType} · {formatBytes(resume.fileSize)}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <button
                          type="button"
                          onClick={() => downloadResume(resume.id)}
                          className="w-full text-left"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </button>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setReplaceTarget({ id: resume.id, title: resume.title })}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Replace file
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteResume(resume.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {resume.tags && resume.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {resume.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>v{resume.version}</span>
                  <span>{formatRelativeTime(resume.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ResumeUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["resumes"] });
          setUploadOpen(false);
        }}
      />
      {replaceTarget && (
        <ResumeReplaceDialog
          open={!!replaceTarget}
          onOpenChange={(open) => { if (!open) setReplaceTarget(null); }}
          resumeId={replaceTarget.id}
          resumeTitle={replaceTarget.title}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["resumes"] });
            setReplaceTarget(null);
          }}
        />
      )}
    </div>
  );
}
