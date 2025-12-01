import type { Metadata } from "next";
import { SettingsTabs } from "@/modules/settings/components/settings-tabs";
export const metadata: Metadata = { title: "Settings" };
export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile, team workspace, and API access.
        </p>
      </div>
      <SettingsTabs />
    </div>
  );
}
