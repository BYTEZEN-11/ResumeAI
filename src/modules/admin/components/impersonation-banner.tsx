"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/shared/hooks/use-api";
export function ImpersonationBanner() {
  const { data: session } = useSession();
  const [stopping, setStopping] = useState(false);
  const isImpersonating = (
    session as typeof session & { isImpersonating?: boolean }
  )?.isImpersonating;
  if (!isImpersonating) return null;
  async function stopImpersonation() {
    setStopping(true);
    try {
      await apiFetch("/api/v1/admin/impersonate", { method: "DELETE" });
      toast.success("Impersonation ended. Returning to admin account...");

      window.location.href = "/admin";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to stop impersonation");
      setStopping(false);
    }
  }
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 backdrop-blur-sm px-5 py-3 shadow-lg">
      <ShieldAlert className="h-5 w-5 text-orange-500 shrink-0" />
      <div className="text-sm">
        <span className="font-semibold text-orange-600 dark:text-orange-400">
          Admin Mode:
        </span>{" "}
        <span className="text-muted-foreground">
          You are viewing as{" "}
          <strong className="text-foreground">
            {session?.user?.name ?? session?.user?.email}
          </strong>
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="border-orange-500/40 hover:bg-orange-500/10 shrink-0"
        onClick={stopImpersonation}
        disabled={stopping}
      >
        {stopping ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Exit
          </>
        )}
      </Button>
    </div>
  );
}
