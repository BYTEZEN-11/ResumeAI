import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppLayout } from "@/shared/components/layout/app-layout";
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  return <AppLayout>{children}</AppLayout>;
}
