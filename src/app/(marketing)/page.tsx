import type { Metadata } from "next";
import Link from "next/link";
import {
  Sparkles, FileText, Target, Lightbulb, MessageSquare,
  History, BarChart3, Check, ArrowRight, Zap
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { APP_DESCRIPTION, APP_URL } from "@/constants";
export const metadata: Metadata = {
  title: "ResumeRank AI — AI-Powered Resume Analysis & ATS Scoring",
  description: APP_DESCRIPTION,
};
const FEATURES = [  { icon: Target, title: "ATS Score", description: "Instant ATS compatibility score with detailed breakdown across keywords, formatting, and sections.", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: FileText, title: "Skill Gap Analysis", description: "Identify exactly which skills are missing from your resume compared to the job requirements.", color: "text-purple-500", bg: "bg-purple-500/10" },
  { icon: Sparkles, title: "AI Resume Rewrites", description: "Get AI-generated rewrites for weak resume sections with stronger action verbs and metrics.", color: "text-primary", bg: "bg-primary/10" },
  { icon: MessageSquare, title: "Interview Questions", description: "Role-specific behavioral, technical, and situational interview questions tailored to your profile.", color: "text-green-500", bg: "bg-green-500/10" },
  { icon: Lightbulb, title: "Smart Recommendations", description: "Actionable, prioritized suggestions to improve every section of your resume.", color: "text-orange-500", bg: "bg-orange-500/10" },
  { icon: History, title: "Resume History", description: "Track your improvement over time with full analysis history, trends, and comparison tools.", color: "text-pink-500", bg: "bg-pink-500/10" },
  { icon: BarChart3, title: "Dashboard Analytics", description: "Visual dashboard showing score trends, top missing skills, and recent performance.", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { icon: Zap, title: "Career Recommendations", description: "AI-driven career path recommendations based on your current skills and target roles.", color: "text-yellow-500", bg: "bg-yellow-500/10" },
];
const PRICING = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started",
    features: ["3 analyses per month", "3 resumes", "Basic ATS scoring", "30-day history"],
    cta: "Get Started Free",
    href: "/auth/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    description: "For serious job seekers",
    features: [
      "Unlimited analyses",
      "Unlimited resumes",
      "Full ATS breakdown",
      "AI resume rewrites",
      "Interview questions",
      "Career recommendations",
      "1-year history",
      "CSV export",
    ],
    cta: "Start Pro",
    href: "/auth/signup",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$49",
    description: "For teams and coaches",
    features: [
      "Everything in Pro",
      "5 team seats",
      "Shared workspace",
      "Team analytics",
      "Priority support",
    ],
    cta: "Start Team",
    href: "/auth/signup",
    highlighted: false,
  },
];
type PublicStats = {
  totalUsers: number;
  totalAnalyses: number;
  avgAtsScore: number;
};
async function getPublicStats(): Promise<PublicStats> {
  try {
    const res = await fetch(`${APP_URL}/api/v1/public/stats`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("Failed");
    const json = await res.json();
    return json.data as PublicStats;
  } catch {

    return { totalUsers: 0, totalAnalyses: 0, avgAtsScore: 0 };
  }
}
function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k+`;
  return n > 0 ? `${n}+` : "—";
}
export default async function HomePage() {
  const stats = await getPublicStats();
  const LIVE_STATS = [
    {
      value: formatStat(stats.totalUsers),
      label: "Users",
      show: stats.totalUsers > 0,
    },
    {
      value: formatStat(stats.totalAnalyses),
      label: "Analyses Run",
      show: stats.totalAnalyses > 0,
    },
    {
      value: stats.avgAtsScore > 0 ? `${stats.avgAtsScore}` : "—",
      label: "Avg ATS Score",
      show: true,
    },
    {
      value: "< 30s",
      label: "Analysis Time",
      show: true,
    },
  ];
  return (
    <div className="overflow-hidden">
      {}
      <section className="relative py-24 px-6 text-center">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto max-w-4xl space-y-8">
          <Badge variant="secondary" className="text-xs px-3 py-1.5">
            <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
            Powered by GPT-4o
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            Get Your Resume{" "}
            <span className="text-primary">Noticed</span>{" "}
            by Every ATS
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Upload your resume and a job description. Our AI analyzes your match score,
            identifies skill gaps, and gives you actionable rewrites — in under 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="xl" asChild>
              <Link href="/auth/signup">
                <Sparkles className="h-5 w-5" />
                Analyze My Resume Free
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="/auth/signin">
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            No credit card required · 3 free analyses per month
          </p>
        </div>
      </section>
      {}
      <section className="border-y bg-muted/30 py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {LIVE_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {}
      <section id="features" className="py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16 space-y-3">
            <Badge variant="secondary">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need to land the job
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From ATS scoring to AI-powered rewrites, every tool a job seeker needs.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="hover:shadow-md transition-all hover:-translate-y-0.5">
                  <CardContent className="p-6 space-y-3">
                    <div className={`inline-flex rounded-xl p-3 ${f.bg}`}>
                      <Icon className={`h-5 w-5 ${f.color}`} />
                    </div>
                    <h3 className="font-semibold">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      {}
      <section className="py-24 px-6 bg-muted/20">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6">How It Works</Badge>
          <h2 className="text-3xl font-bold mb-12">Three steps to a better resume</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: "Upload Resume", desc: "Drag and drop your PDF or DOCX resume. We extract and analyze the content." },
              { step: "02", title: "Paste Job Description", desc: "Paste the job description. Our AI compares it against your resume in detail." },
              { step: "03", title: "Get Your Analysis", desc: "Receive your ATS score, skill gaps, rewrites, and interview questions instantly." },
            ].map((s) => (
              <div key={s.step} className="relative text-center space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  {s.step}
                </div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {}
      <section id="pricing" className="py-24 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16 space-y-3">
            <Badge variant="secondary">Pricing</Badge>
            <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Start free, upgrade when you need more.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={`relative ${plan.highlighted ? "border-primary ring-1 ring-primary shadow-lg" : ""}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge>Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-8 space-y-6">
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-3">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.price !== "$0" && <span className="text-muted-foreground text-sm">/month</span>}
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {}
      <section className="py-24 px-6 text-center bg-gradient-to-b from-transparent to-primary/5">
        <div className="container mx-auto max-w-2xl space-y-6">
          <h2 className="text-3xl font-bold">Ready to get more interviews?</h2>
          <p className="text-muted-foreground">
            Join thousands of job seekers who improved their resume with AI.
          </p>
          <Button size="xl" asChild>
            <Link href="/auth/signup">
              <Sparkles className="h-5 w-5" />
              Start for Free
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
