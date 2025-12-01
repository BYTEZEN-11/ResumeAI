import type { Metadata } from "next";
import { ApiKeysPanel } from "@/modules/settings/components/api-keys-panel";
export const metadata: Metadata = { title: "API Keys" };
export default function ApiKeysPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="text-muted-foreground mt-1">
          Manage API keys for programmatic access to your account.
        </p>
      </div>
      <ApiKeysPanel />
    </div>
  );
}
