"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, Target, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { apiFetch } from "@/shared/hooks/use-api";
const STEPS = [
  {
    id: "welcome",
    title: "Welcome to ResumeRank AI",
    description: "You're seconds away from your first AI-powered resume analysis.",
    icon: Sparkles,
  },
  {
    id: "profile",
    title: "Tell us about yourself",
    description: "This helps us personalize your experience.",
    icon: Target,
  },
  {
    id: "ready",
    title: "You're all set!",
    description: "Start by uploading your resume and a job description.",
    icon: Check,
  },
];
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [jobTitle, setJobTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  async function handleNext() {
    setSaveError(null);
    if (step === 1 && jobTitle) {
      setSaving(true);
      try {
        await apiFetch("/api/v1/profile", {
          method: "PATCH",
          body: JSON.stringify({ jobTitle }),
        });
      } catch (err) {

        const message =
          err instanceof Error ? err.message : "Couldn't save your title right now.";
        setSaveError(message);
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    if (step === STEPS.length - 1) {
      router.push("/dashboard");
      return;
    }
    setStep((s) => s + 1);
  }
  function handleBack() {
    setSaveError(null);
    setStep((s) => Math.max(0, s - 1));
  }
  const current = STEPS[step];
  const Icon = current.icon;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-6">
      <div className="w-full max-w-md">
        {}
        <div className="flex items-center justify-center gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-8 bg-primary" : i < step ? "w-4 bg-primary/50" : "w-4 bg-muted"
              }`}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-8 text-center"
          >
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{current.title}</h1>
              <p className="text-muted-foreground">{current.description}</p>
            </div>
            {step === 1 && (
              <div className="text-left space-y-1.5">
                <Label htmlFor="jobTitle">What is your target job title?</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g. Software Engineer, Product Manager..."
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  autoFocus
                />
              </div>
            )}
            {step === 2 && (
              <div className="grid grid-cols-3 gap-4 text-left">
                {[
                  { icon: FileText, label: "Upload Resume", desc: "PDF or DOCX" },
                  { icon: Target, label: "Paste JD", desc: "Any job posting" },
                  { icon: Sparkles, label: "Get Analysis", desc: "In 30 seconds" },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border bg-card p-4 text-center space-y-2">
                      <ItemIcon className="h-5 w-5 text-primary mx-auto" />
                      <p className="text-xs font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <Button size="lg" className="w-full" onClick={handleNext} disabled={saving}>
              {step === STEPS.length - 1 ? (
                <>Go to Dashboard <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
            {saveError && (
              <p className="text-xs text-destructive" role="alert">
                {saveError} You can try again or continue without saving.
              </p>
            )}
            <div className="flex items-center justify-between">
              {step > 0 ? (
                <button
                  onClick={handleBack}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 && (
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
