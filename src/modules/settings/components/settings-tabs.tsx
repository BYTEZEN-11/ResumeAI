"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { User, Users, Key, Webhook } from "lucide-react";
import { SettingsPanel } from "./settings-panel";
import { TeamPanel } from "./team-panel";
import { ApiKeysPanel } from "./api-keys-panel";
import { WebhooksPanel } from "@/modules/webhooks/components/webhooks-panel";
export function SettingsTabs() {
  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="team" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team
        </TabsTrigger>
        <TabsTrigger value="api-keys" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          API Keys
        </TabsTrigger>
        <TabsTrigger value="webhooks" className="flex items-center gap-2">
          <Webhook className="h-4 w-4" />
          Webhooks
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile">
        <SettingsPanel />
      </TabsContent>
      <TabsContent value="team">
        <TeamPanel />
      </TabsContent>
      <TabsContent value="api-keys">
        <ApiKeysPanel />
      </TabsContent>
      <TabsContent value="webhooks">
        <WebhooksPanel />
      </TabsContent>
    </Tabs>
  );
}
