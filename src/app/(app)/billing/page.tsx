import type { Metadata } from "next";
import { BillingPanel } from "@/modules/billing/components/billing-panel";
export const metadata: Metadata = { title: "Billing" };
export default function BillingPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and payment details.
        </p>
      </div>
      <BillingPanel />
    </div>
  );
}
