import type { Metadata } from "next";
import { AdminUsersTable } from "@/modules/admin/components/admin-users-table";
export const metadata: Metadata = { title: "Admin — Users" };
export default function AdminUsersPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1">Manage all platform users.</p>
      </div>
      <AdminUsersTable />
    </div>
  );
}
