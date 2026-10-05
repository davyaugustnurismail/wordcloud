import { notFound, redirect } from "next/navigation";
import { BlocklistManager } from "@/components/admin/blocklist-manager";
import { hasAdminAccess } from "@/lib/auth/access";
import { listGlobalTerms, listSessionTerms } from "@/lib/blocklist";
import { isValidCode, normalizeCode } from "@/lib/code";
import { findSessionByCode } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function AdminBlocklistPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const session = isValidCode(code) ? await findSessionByCode(code) : null;
  if (!session) notFound();
  if (!(await hasAdminAccess(code))) redirect(`/masuk-admin?kode=${code}`);

  const [terms, globalTerms] = await Promise.all([listSessionTerms(session.id), listGlobalTerms()]);
  return <BlocklistManager code={code} initialTerms={terms} globalTerms={globalTerms} />;
}
