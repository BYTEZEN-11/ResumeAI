import type { Metadata } from "next";
import { AdminDashboard } from "@/modules/admin/components/admin-dashboard";
export const metadata: Metadata = { title: "Admin Dashboard" };
export default function AdminPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform-wide metrics and controls.</p>
      </div>
      <AdminDashboard />
    </div>
  );
}
