import { GlobalBlocklist } from "@/components/global/global-blocklist";
import { listTerms } from "@/lib/blocklist";
import { listSessionOverviews } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function GlobalBlocklistPage() {
  const [globalTerms, sessions] = await Promise.all([listTerms(null), listSessionOverviews()]);
  return (
    <GlobalBlocklist
      globalTerms={globalTerms}
      sessions={sessions.map((session) => ({ id: session.id, name: session.name, code: session.code }))}
    />
  );
}
