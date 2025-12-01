import type { Metadata } from "next";
import { CoverLetterGenerator } from "@/modules/cover-letter/components/cover-letter-generator";
export const metadata: Metadata = { title: "Cover Letter Generator" };
export default function CoverLetterPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cover Letter Generator</h1>
        <p className="text-muted-foreground mt-1">
          Generate a tailored AI cover letter from your resume and job description. Edit and download in seconds.
        </p>
      </div>
      <CoverLetterGenerator />
    </div>
  );
}
