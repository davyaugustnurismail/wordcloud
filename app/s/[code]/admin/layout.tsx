import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin/admin-provider";
import { AdminShell } from "@/components/admin/admin-shell";
import { hasAdminAccess } from "@/lib/auth/access";
import { isValidCode, normalizeCode } from "@/lib/code";
import { findSessionByCode } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sesi" };

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ code: string }>;
}) {
  const code = normalizeCode((await params).code);
  const session = isValidCode(code) ? await findSessionByCode(code) : null;
  if (!session) notFound();
  if (!(await hasAdminAccess(code))) redirect(`/masuk-admin?kode=${code}`);

  return (
    <AdminProvider code={code} name={session.name} initialSettings={session.settings} initialState={session.state}>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
