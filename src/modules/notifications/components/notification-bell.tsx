"use client";
import { Bell } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useApiQuery, useApiMutation, apiFetch } from "@/shared/hooks/use-api";
import { formatRelativeTime } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { Notification } from "@/types";
type NotifResponse = { notifications: Notification[]; unreadCount: number };
export function NotificationBell() {
  const queryClient = useQueryClient();
  const { data } = useApiQuery<NotifResponse>(
    ["notifications"],
    "/api/v1/notifications?unreadOnly=false&pageSize=10",
    { staleTime: 30_000 }
  );
  const unreadCount = data?.data?.unreadCount ?? 0;
  const notifications = data?.data?.notifications ?? [];
  const { mutate: markAllRead } = useApiMutation(
    () => apiFetch("/api/v1/notifications/read-all", { method: "POST" }),
    {
      invalidateKeys: [["notifications"]],
    }
  );
  const { mutate: markRead } = useApiMutation(
    (id: string) => apiFetch(`/api/v1/notifications/${id}`, { method: "PATCH" }),
    { invalidateKeys: [["notifications"]] }
  );
  const notifTypeIcon = (type: string) => {
    switch (type) {
      case "ANALYSIS_COMPLETE": return "✅";
      case "ANALYSIS_FAILED": return "❌";
      case "SUBSCRIPTION_UPDATED": return "⭐";
      default: return "🔔";
    }
  };
  return (
    <DropdownMenu onOpenChange={(open) => {
      if (open) queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead(undefined)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 8).map((notif) => (
            <DropdownMenuItem
              key={notif.id}
              className="flex flex-col items-start gap-1 py-3"
              onClick={() => !notif.isRead && markRead(notif.id)}
            >
              <div className="flex w-full items-start gap-2">
                <span className="text-base">{notifTypeIcon(notif.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{notif.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {formatRelativeTime(notif.createdAt)}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="h-2 w-2 shrink-0 rounded-full bg-primary mt-1" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
