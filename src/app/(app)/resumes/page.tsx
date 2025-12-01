import type { Metadata } from "next";
import { ResumeList } from "@/modules/resume/components/resume-list";
export const metadata: Metadata = { title: "Resumes" };
export default function ResumesPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resumes</h1>
        <p className="text-muted-foreground mt-1">
          Upload and manage your resumes. Keep multiple versions for different roles.
        </p>
      </div>
      <ResumeList />
    </div>
  );
}
