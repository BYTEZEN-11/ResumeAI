import type { Metadata } from "next";
import { SignInForm } from "@/modules/auth/components/signin-form";
export const metadata: Metadata = { title: "Sign In" };
export default function SignInPage() {
  return <SignInForm />;
}
