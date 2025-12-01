"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { ThemeToggle } from "@/shared/components/ui/theme-toggle";
export function MarketingNav() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { href: "#features", label: "Features" },
    { href: "#pricing", label: "Pricing" },
    { href: "#about", label: "About" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">ResumeRank AI</span>
        </Link>
        {}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {session ? (
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth/signin">Sign In</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Get Started Free</Link>
              </Button>
            </>
          )}
        </div>
        {}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-6 py-4 space-y-3">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="block text-sm py-2 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              {l.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            {session ? (
              <Button asChild><Link href="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="outline" asChild><Link href="/auth/signin">Sign In</Link></Button>
                <Button asChild><Link href="/auth/signup">Get Started</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
