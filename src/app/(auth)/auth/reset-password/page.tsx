import type { Metadata } from "next";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";
export const metadata: Metadata = { title: "Reset Password" };
export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
