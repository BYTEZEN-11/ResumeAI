import Link from "next/link";
import { Sparkles } from "lucide-react";
export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">ResumeRank AI</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              AI-powered resume analysis and career optimization for modern job seekers.
            </p>
          </div>
          {[
            {
              heading: "Product",
              links: [
                { label: "Features", href: "#features" },
                { label: "Pricing", href: "#pricing" },
                { label: "Dashboard", href: "/dashboard" },
              ],
            },
            {
              heading: "Company",
              links: [
                { label: "About", href: "#about" },
                { label: "Blog", href: "#" },
                { label: "Careers", href: "#" },
              ],
            },
            {
              heading: "Legal",
              links: [
                { label: "Privacy Policy", href: "#" },
                { label: "Terms of Service", href: "#" },
                { label: "Cookie Policy", href: "#" },
              ],
            },
          ].map((col) => (
            <div key={col.heading} className="space-y-3">
              <h4 className="text-sm font-semibold">{col.heading}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ResumeRank AI. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with Next.js · Powered by OpenAI
          </p>
        </div>
      </div>
    </footer>
  );
}
