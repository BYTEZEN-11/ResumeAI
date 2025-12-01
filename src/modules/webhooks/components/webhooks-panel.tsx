"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Webhook, Plus, Trash2, Copy, Check, Loader2,
  ChevronDown, ChevronUp, CheckCircle2, XCircle,
  AlertTriangle, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/components/ui/dialog";
import { apiFetch } from "@/shared/hooks/use-api";
import { formatRelativeTime } from "@/lib/utils";
type WebhookRow = {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  lastFiredAt: string | null;
  failCount: number;
  createdAt: string;
  _count: { deliveries: number };
  deliveries: { success: boolean; statusCode: number | null; attemptedAt: string }[];
};
type Delivery = {
  id: string;
  event: string;
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
  duration: number | null;
  attemptedAt: string;
};
const EVENT_OPTIONS = [
  { value: "ANALYSIS_COMPLETE", label: "Analysis Complete", desc: "Fired when an analysis finishes" },
  { value: "ANALYSIS_FAILED", label: "Analysis Failed", desc: "Fired when an analysis fails" },
  { value: "SUBSCRIPTION_UPDATED", label: "Subscription Updated", desc: "Fired on plan changes" },
];
function DeliveryLog({ webhookId }: { webhookId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["webhook-deliveries", webhookId],
    queryFn: () => apiFetch<Delivery[]>(`/api/v1/webhooks/${webhookId}`),
  });
  const deliveries = data?.data ?? [];
  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  if (deliveries.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">No deliveries yet.</p>;
  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {deliveries.map((d) => (
        <div key={d.id} className="flex items-start gap-2 text-xs rounded-lg border px-3 py-2">
          {d.success
            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
            : <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{d.event}</span>
              <span className="text-muted-foreground shrink-0">
                {d.statusCode ? `HTTP ${d.statusCode}` : "No response"}
                {d.duration ? ` · ${d.duration}ms` : ""}
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5">{formatRelativeTime(d.attemptedAt)}</p>
            {d.responseBody && (
              <p className="text-muted-foreground font-mono truncate mt-0.5">{d.responseBody}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
export function WebhooksPanel() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["ANALYSIS_COMPLETE"]);
  const [saving, setSaving] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => apiFetch<WebhookRow[]>("/api/v1/webhooks"),
  });
  const hooks = data?.data ?? [];
  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }
  async function createWebhook() {
    if (!name.trim() || !url.trim()) { toast.error("Name and URL are required"); return; }
    if (!url.startsWith("https://")) { toast.error("Webhook URL must use HTTPS"); return; }
    if (selectedEvents.length === 0) { toast.error("Select at least one event"); return; }
    setSaving(true);
    try {
      const res = await apiFetch<WebhookRow>("/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), url: url.trim(), events: selectedEvents }),
      });
      if (res.data?.secret) {
        setNewSecret(res.data.secret);
      }
      setCreateOpen(false);
      setName(""); setUrl(""); setSelectedEvents(["ANALYSIS_COMPLETE"]);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook created!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create webhook");
    } finally {
      setSaving(false);
    }
  }
  async function deleteWebhook(id: string, hookName: string) {
    try {
      await apiFetch(`/api/v1/webhooks/${id}`, { method: "DELETE" });
      toast.success(`"${hookName}" deleted`);
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }
  async function copySecret(secret: string) {
    await navigator.clipboard.writeText(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-primary" />
                <CardTitle>Webhooks</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Get real-time HTTP POST notifications when events happen in your account.
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={hooks.length >= 10}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {}
          <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Each request includes a <code className="font-mono">X-ResumeRank-Signature</code> header
              (HMAC-SHA256). Verify it with your secret to ensure authenticity.
            </p>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : hooks.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
              <Webhook className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No webhooks yet. Add one to receive real-time events.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hooks.map((hook) => {
                const isExpanded = expandedId === hook.id;
                const lastDelivery = hook.deliveries[0];
                return (
                  <div key={hook.id} className="rounded-xl border overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                          hook.isActive && hook.failCount < 10 ? "bg-green-500" : "bg-red-500"
                        }`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{hook.name}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">{hook.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {}
                        <div className="hidden sm:flex gap-1">
                          {hook.events.map((e) => (
                            <Badge key={e} variant="secondary" className="text-xs py-0">
                              {e.replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                        {}
                        {lastDelivery && (
                          lastDelivery.success
                            ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                            : <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {hook.failCount > 0 && (
                          <span className="text-xs text-red-500">{hook.failCount} fails</span>
                        )}
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => setExpandedId(isExpanded ? null : hook.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                          onClick={() => deleteWebhook(hook.id, hook.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {}
                    {isExpanded && (
                      <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Recent Deliveries ({hook._count.deliveries})
                          </p>
                          {hook.lastFiredAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last fired {formatRelativeTime(hook.lastFiredAt)}
                            </span>
                          )}
                        </div>
                        <DeliveryLog webhookId={hook.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure an endpoint to receive real-time event notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input placeholder='e.g. "My Server"' value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Endpoint URL</Label>
              <Input placeholder="https://yourwebhook.site/webhook" value={url} onChange={(e) => setUrl(e.target.value)} />
              <p className="text-xs text-muted-foreground">Must be HTTPS</p>
            </div>
            <div className="space-y-2">
              <Label>Events to receive</Label>
              {EVENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleEvent(opt.value)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selectedEvents.includes(opt.value) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{opt.label}</span>
                    {selectedEvents.includes(opt.value) && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createWebhook} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Webhook"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {}
      <Dialog open={!!newSecret} onOpenChange={(o) => !o && setNewSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Webhook Created
            </DialogTitle>
            <DialogDescription>
              Copy your signing secret now — it will <strong>not be shown again</strong>.
            </DialogDescription>
          </DialogHeader>
          {newSecret && (
            <div className="space-y-3 py-2">
              <Label>Signing Secret</Label>
              <div className="flex gap-2">
                <code className="flex-1 rounded-lg border bg-muted px-3 py-2.5 text-xs font-mono break-all select-all">
                  {newSecret}
                </code>
                <Button size="icon" variant="outline" className="shrink-0" onClick={() => copySecret(newSecret)}>
                  {secretCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this to verify the <code className="font-mono">X-ResumeRank-Signature</code> header on incoming requests.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setNewSecret(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
