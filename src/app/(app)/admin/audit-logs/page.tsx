import type { Metadata } from "next";
import { AuditLogsTable } from "@/modules/admin/components/audit-logs-table";
export const metadata: Metadata = { title: "Admin — Audit Logs" };
export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Full history of all user and admin actions on the platform.
        </p>
      </div>
      <AuditLogsTable />
    </div>
  );
}
