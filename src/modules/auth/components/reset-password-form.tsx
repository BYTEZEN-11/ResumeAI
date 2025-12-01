"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Loader2, Eye, EyeOff, Check, X, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { apiFetch } from "@/shared/hooks/use-api";
import { Suspense } from "react";
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[a-z]/, "Must contain a lowercase letter")
      .regex(/[0-9]/, "Must contain a number")
      .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];
function ResetPasswordFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");
  const [showPwd, setShowPwd] = useState(false);
  const [done, setDone] = useState(false);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });
  const password = form.watch("password");

  if (!token || !email) {
    return (
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <X className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground">
            This password reset link is invalid or has already been used.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/auth/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }
  if (done) {
    return (
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <Check className="h-8 w-8 text-green-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Password reset!</h1>
          <p className="text-sm text-muted-foreground">
            Your password has been updated. Sign in with your new password.
          </p>
        </div>
        <Button asChild>
          <Link href="/auth/signin">Sign In</Link>
        </Button>
      </div>
    );
  }
  async function onSubmit(values: ResetPasswordInput) {
    try {
      await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: decodeURIComponent(email!),
          token,
          password: values.password,
        }),
      });
      setDone(true);
      toast.success("Password reset successfully");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Reset failed";

      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
        toast.error("This reset link has expired. Please request a new one.");
        router.push("/auth/forgot-password");
      } else {
        toast.error(msg);
      }
    }
  }
  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password for your account.
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {}
          {password && (
            <div className="grid grid-cols-2 gap-1 mt-2">
              {PASSWORD_RULES.map((rule) => {
                const passes = rule.test(password);
                return (
                  <div key={rule.label} className="flex items-center gap-1.5">
                    {passes ? (
                      <Check className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={`text-xs ${passes ? "text-green-500" : "text-muted-foreground"}`}
                    >
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-destructive">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
      <div className="text-center">
        <Link
          href="/auth/signin"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
export function ResetPasswordForm() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
