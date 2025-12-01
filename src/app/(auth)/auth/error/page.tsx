"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Suspense } from "react";
const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a server configuration error.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification link has expired or already been used.",
  OAuthSignin: "Could not start the OAuth sign-in flow.",
  OAuthCallback: "Could not complete the OAuth sign-in.",
  OAuthAccountNotLinked: "This email is already linked to a different sign-in method.",
  Default: "An unexpected error occurred during sign in.",
};
function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") ?? "Default";
  const message = ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default;
  return (
    <div className="flex flex-col items-center text-center space-y-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Authentication Error</h1>
        <p className="text-muted-foreground">{message}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/">Go Home</Link>
        </Button>
        <Button asChild>
          <Link href="/auth/signin">Try Again</Link>
        </Button>
      </div>
    </div>
  );
}
export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div />}>
      <ErrorContent />
    </Suspense>
  );
}
