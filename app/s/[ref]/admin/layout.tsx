import type { Metadata } from "next";
import { AdminProvider } from "@/components/admin/admin-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { loadSessionForAdmin } from "@/lib/session-page";
import { sessionRef } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sesi" };

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ref: string }>;
}) {
  const session = await loadSessionForAdmin((await params).ref);

  return (
    <AdminProvider
      code={session.code}
      sessionRef={sessionRef(session)}
      name={session.name}
      initialSettings={session.settings}
      initialState={session.state}
    >
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
