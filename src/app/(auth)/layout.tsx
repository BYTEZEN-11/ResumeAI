import { Sparkles } from "lucide-react";
import Link from "next/link";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/20 via-primary/5 to-background p-12 border-r">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">ResumeRank AI</span>
        </Link>
        <div className="space-y-6">
          <blockquote className="space-y-2">
            <p className="text-lg leading-relaxed">
              &ldquo;ResumeRank AI helped me identify exactly what skills were missing. I landed 3 interviews in my first week after optimizing.&rdquo;
            </p>
            <footer className="text-sm text-muted-foreground">
              — Alex Chen, Software Engineer
            </footer>
          </blockquote>
          <div className="flex gap-4">
            {[
              { label: "ATS Score", value: "94" },
              { label: "Skill Match", value: "89%" },
              { label: "Users", value: "50k+" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-background/80 border px-4 py-3 text-center">
                <p className="text-2xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} ResumeRank AI. All rights reserved.
        </p>
      </div>
      {}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
