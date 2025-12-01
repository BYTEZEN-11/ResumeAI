import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Privacy Policy — ResumeRank AI",
  description: "How ResumeRank AI collects, uses, and protects your personal data.",
};
const SECTIONS = [
  {
    title: "What we collect",
    body: "We collect (a) account information you provide on signup — email, name, and a hashed password; (b) content you upload — resumes, job descriptions, and any custom notes; (c) usage data — which features you use, request counts, and error logs; and (d) payment data — handled by Stripe; we store the customer ID and last 4 digits of the card but never the card number.",
  },
  {
    title: "How we use it",
    body: "We use your content to provide the analysis, cover letter, and rewriting features you request. We use usage data to improve the product, detect abuse, and prioritise engineering work. We do not sell your data to third parties, and we do not use your resume content to train our own models.",
  },
  {
    title: "Sub-processors",
    body: "We use the following sub-processors to deliver the Service: Supabase (database and file storage), OpenAI (AI analysis — your content is sent to OpenAI to generate results, see OpenAI's data usage policy), Stripe (payments), Inngest (background jobs), and Resend (transactional email). Each is contractually required to protect your data.",
  },
  {
    title: "Cookies and session",
    body: "We use a session cookie (set by NextAuth) to keep you signed in. We use a single first-party analytics cookie only if you opt in. We do not use third-party advertising cookies.",
  },
  {
    title: "Data retention",
    body: "We keep your account data for as long as your account is active. If you delete your account, we permanently delete your content within 30 days; aggregated, non-identifying analytics may be retained. We retain billing records for 7 years as required by tax law.",
  },
  {
    title: "Your rights (GDPR / CCPA)",
    body: "You can request a copy of all data we hold about you, correct inaccurate data, or delete your account entirely. Account self-deletion is available at Settings → Danger Zone; data export is available at Settings → Export. For data requests we cannot service directly, email privacy@resumerank.ai and we will respond within 30 days.",
  },
  {
    title: "Security",
    body: "We encrypt data in transit (TLS) and at rest (Supabase AES-256). Passwords are hashed with bcrypt. We use session cookies with HttpOnly, Secure, and SameSite=Lax flags. We log security events and run quarterly access reviews. No system is 100% secure — please use a strong, unique password.",
  },
  {
    title: "Children",
    body: "The Service is not directed at children under 16, and we do not knowingly collect personal data from them.",
  },
  {
    title: "International transfers",
    body: "We are based in the US. If you are in the EU/UK, your data may be transferred to and processed in the US; we rely on Standard Contractual Clauses for these transfers.",
  },
  {
    title: "Changes",
    body: "We will post material changes here and notify active users by email at least 30 days before they take effect.",
  },
  {
    title: "Contact",
    body: "Email privacy@resumerank.ai for any privacy-related question.",
  },
];
export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back home
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-muted-foreground">
          Last updated: 1 January 2026
        </p>
        <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert">
          {SECTIONS.map((s) => (
            <section key={s.title} className="mt-8">
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <p className="mt-2 text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
