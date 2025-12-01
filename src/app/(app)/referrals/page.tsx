import type { Metadata } from "next";
import { ReferralPanel } from "@/modules/referrals/components/referral-panel";
export const metadata: Metadata = {
  title: "Referrals",
  description: "Invite friends and earn bonus analyses",
};
export default function ReferralsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invite Friends</h1>
        <p className="text-muted-foreground mt-1">
          Share your referral link and earn bonus analyses when friends sign up.
        </p>
      </div>
      <ReferralPanel />
    </div>
  );
}
