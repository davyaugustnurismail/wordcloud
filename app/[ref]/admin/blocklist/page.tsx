import { BlocklistManager } from "@/components/admin/blocklist-manager";
import { listGlobalTerms, listSessionTerms } from "@/lib/blocklist";
import { loadSessionForAdmin } from "@/lib/session-page";

export const dynamic = "force-dynamic";

export default async function AdminBlocklistPage({ params }: { params: Promise<{ ref: string }> }) {
  const session = await loadSessionForAdmin((await params).ref);

  const [terms, globalTerms] = await Promise.all([listSessionTerms(session.id), listGlobalTerms()]);
  return <BlocklistManager code={session.code} initialTerms={terms} globalTerms={globalTerms} />;
}
