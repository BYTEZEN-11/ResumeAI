import type { Metadata } from "next";
import { SignUpForm } from "@/modules/auth/components/signup-form";
export const metadata: Metadata = { title: "Create Account" };
export default function SignUpPage() {
  return <SignUpForm />;
}
