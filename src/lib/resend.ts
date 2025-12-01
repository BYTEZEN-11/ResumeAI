import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (process.env.NODE_ENV === "production" && !apiKey) {
  throw new Error(
    "RESEND_API_KEY is required in production. Set it in your environment."
  );
}
export const resend = new Resend(apiKey ?? "re_placeholder-not-for-production");
export const EMAIL_CONFIG = {
  from: `${process.env.RESEND_FROM_NAME ?? "ResumeRank AI"} <${process.env.RESEND_FROM_EMAIL ?? "noreply@resumerank.ai"}>`,
  replyTo: process.env.RESEND_FROM_EMAIL ?? "noreply@resumerank.ai",
} as const;
