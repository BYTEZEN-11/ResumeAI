"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift, Copy, Users, TrendingUp, CheckCircle2, Loader2, Share2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { apiFetch } from "@/shared/hooks/use-api";
type ReferralData = {
  code: string;
  referralUrl: string;
  totalReferrals: number;
  converted: number;
  totalBonusEarned: number;
  referrerBonus: number;
  referredBonus: number;
};
export function ReferralPanel() {
  const [copied, setCopied] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => apiFetch<ReferralData>("/api/v1/referrals"),
  });
  const referralData = data?.data;
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }
  function shareViaEmail() {
    if (!referralData) return;
    const subject = encodeURIComponent("Try ResumeRank AI - Get Bonus Analyses!");
    const body = encodeURIComponent(
      `I've been using ResumeRank AI to optimize my resume with AI-powered insights. Join using my referral link and we both get bonus analyses!\n\n${referralData.referralUrl}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }
  function shareNative() {
    if (!referralData) return;
    if (navigator.share) {
      navigator
        .share({
          title: "Try ResumeRank AI",
          text: `Join ResumeRank AI and get ${referralData.referredBonus} bonus analyses!`,
          url: referralData.referralUrl,
        })
        .catch(() => {

        });
    } else {
      copyToClipboard(referralData.referralUrl);
    }
  }
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }
  if (!referralData) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p className="text-sm text-muted-foreground">Unable to load referral data</p>
        </CardContent>
      </Card>
    );
  }
  const conversionRate =
    referralData.totalReferrals > 0
      ? Math.round((referralData.converted / referralData.totalReferrals) * 100)
      : 0;
  return (
    <div className="space-y-6">
      {}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralData.totalReferrals}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {referralData.converted} converted
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {referralData.converted} of {referralData.totalReferrals} signups
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bonus Earned</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referralData.totalBonusEarned}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Extra analyses earned
            </p>
          </CardContent>
        </Card>
      </div>
      {}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Your Referral Link
              </CardTitle>
              <CardDescription className="mt-1.5">
                Share this link with friends to earn bonus analyses
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={referralData.referralUrl}
                className="font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(referralData.referralUrl)}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          {}
          <div className="space-y-2">
            <p className="text-sm font-medium">Your Referral Code</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg font-mono px-4 py-2">
                {referralData.code}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(referralData.code)}
              >
                <Copy className="h-3 w-3 mr-1.5" />
                Copy
              </Button>
            </div>
          </div>
          {}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={shareViaEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Share via Email
            </Button>
            <Button variant="outline" onClick={shareNative}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
          {}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <p className="text-sm font-medium">How it works:</p>
            <ol className="text-sm text-muted-foreground space-y-2 ml-4 list-decimal">
              <li>
                Share your referral link or code with friends and colleagues
              </li>
              <li>
                They sign up using your link and get{" "}
                <strong className="text-foreground">{referralData.referredBonus} bonus analyses</strong>
              </li>
              <li>
                You earn{" "}
                <strong className="text-foreground">{referralData.referrerBonus} bonus analyses</strong>{" "}
                for each successful referral
              </li>
              <li>There&apos;s no limit to how many people you can refer!</li>
            </ol>
          </div>
        </CardContent>
      </Card>
      {}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc ml-4">
            <li>Share your link on social media, LinkedIn, or job seeker communities</li>
            <li>Mention how ResumeRank AI helped improve your resume ATS score</li>
            <li>Send personal invites to friends who are actively job hunting</li>
            <li>
              Both you and your friend get bonus analyses - it&apos;s a win-win!
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
