"use client";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from "@/constants";
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeId: string;
  resumeTitle: string;
  onSuccess: () => void;
};
export function ResumeReplaceDialog({
  open,
  onOpenChange,
  resumeId,
  resumeTitle,
  onSuccess,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (f) setFile(f);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    maxFiles: 1,
    onDropRejected: (files) => {
      const err = files[0]?.errors[0];
      if (err?.code === "file-too-large") toast.error("File must be under 5MB");
      else if (err?.code === "file-invalid-type")
        toast.error("Only PDF and DOCX are accepted");
      else toast.error("Invalid file");
    },
  });
  function handleClose() {
    setFile(null);
    onOpenChange(false);
  }
  async function handleReplace() {
    if (!file) {
      toast.error("Please select a replacement file");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/v1/resumes/${resumeId}/replace`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Replace failed");
      toast.success("Resume file replaced successfully");
      setFile(null);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed");
    } finally {
      setUploading(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replace Resume File</DialogTitle>
          <DialogDescription>
            Upload a new file for <span className="font-medium text-foreground">{resumeTitle}</span>.
            The existing file will be archived and the new one will become active.
          </DialogDescription>
        </DialogHeader>
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : file
              ? "border-green-500 bg-green-500/5"
              : "border-border hover:border-primary hover:bg-muted/50"
          }`}
        >
          <input {...getInputProps()} />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3 inline mr-1" />
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {isDragActive ? "Drop it here" : "Drag & drop or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">PDF or DOCX, max 5MB</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleReplace} disabled={uploading || !file}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Replacing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Replace File
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
