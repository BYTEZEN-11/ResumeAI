"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Zap, Users, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { apiFetch } from "@/shared/hooks/use-api";
import { formatDate } from "@/lib/utils";
import type { Subscription, Payment } from "@/types";
type BillingData = { subscription: Subscription; payments: Payment[] };
const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: "$0",
    period: "forever",
    icon: Star,
    color: "text-muted-foreground",
    features: ["3 analyses per month", "3 resumes max", "Basic ATS scoring", "30-day history"],
    cta: "Current Plan",
    planKey: null as null,
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$19",
    period: "per month",
    icon: Zap,
    color: "text-primary",
    highlighted: true,
    features: [
      "Unlimited analyses",
      "Unlimited resumes",
      "Full ATS breakdown",
      "AI resume rewrites",
      "Interview questions",
      "Career recommendations",
      "1-year history",
      "CSV export",
    ],
    cta: "Upgrade to Pro",
    planKey: "PRO" as const,
  },
  {
    id: "TEAM",
    name: "Team",
    price: "$49",
    period: "per month",
    icon: Users,
    color: "text-purple-500",
    features: [
      "Everything in Pro",
      "5 team seats",
      "Shared workspace",
      "Team analytics",
      "Priority support",
    ],
    cta: "Upgrade to Team",
    planKey: "TEAM" as const,
  },
];
export function BillingPanel() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: () => apiFetch<BillingData>("/api/v1/billing/subscription"),
  });
  const subscription = data?.data?.subscription;
  const payments = data?.data?.payments ?? [];
  async function handleCheckout(plan: "PRO" | "TEAM") {
    setCheckoutLoading(plan);
    try {
      const res = await apiFetch<{ url: string }>("/api/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start checkout");
    } finally {
      setCheckoutLoading(null);
    }
  }
  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await apiFetch<{ url: string }>("/api/v1/billing/portal", { method: "POST" });
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open portal");
    } finally {
      setPortalLoading(false);
    }
  }
  if (isLoading) {
    return <div className="h-64 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  const currentPlan = subscription?.plan ?? "FREE";
  const usagePct = subscription
    ? Math.min(100, Math.round((subscription.analysesUsed / subscription.analysesLimit) * 100))
    : 0;
  return (
    <div className="space-y-8">
      {}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  {currentPlan === "FREE" ? "Free tier" : `Active ${currentPlan} subscription`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={currentPlan === "FREE" ? "secondary" : "default"}>
                  {currentPlan}
                </Badge>
                {currentPlan !== "FREE" && (
                  <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Analyses used</span>
                <span className="font-medium">
                  {subscription.analysesUsed} / {subscription.analysesLimit === 999999 ? "∞" : subscription.analysesLimit}
                </span>
              </div>
              {subscription.analysesLimit !== 999999 && (
                <Progress value={usagePct} className="h-2" />
              )}
            </div>
            {subscription.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                {subscription.cancelAtPeriodEnd
                  ? `Cancels on ${formatDate(subscription.currentPeriodEnd)}`
                  : `Renews on ${formatDate(subscription.currentPeriodEnd)}`}
              </p>
            )}
          </CardContent>
        </Card>
      )}
      {}
      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`relative ${plan.highlighted ? "border-primary ring-1 ring-primary" : ""}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="text-xs">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${plan.color}`} />
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">/{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button className="w-full" variant="outline" disabled>
                    Current Plan
                  </Button>
                ) : plan.planKey ? (
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    onClick={() => handleCheckout(plan.planKey!)}
                    disabled={!!checkoutLoading}
                  >
                    {checkoutLoading === plan.planKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : plan.cta}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{p.description ?? "Subscription payment"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      ${(p.amount / 100).toFixed(2)} {p.currency.toUpperCase()}
                    </span>
                    <Badge variant={p.status === "succeeded" ? "success" : "destructive"} className="text-xs">
                      {p.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
