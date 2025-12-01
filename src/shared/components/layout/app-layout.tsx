import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { ImpersonationBanner } from "@/modules/admin/components/impersonation-banner";
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl px-6 py-8">{children}</div>
        </main>
      </div>
      <ImpersonationBanner />
    </div>
  );
}
