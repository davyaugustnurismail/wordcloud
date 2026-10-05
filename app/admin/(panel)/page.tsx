import { GlobalDashboard } from "@/components/global/global-dashboard";
import { listSessionOverviews, loadGlobalStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function GlobalDashboardPage() {
  const [stats, sessions] = await Promise.all([loadGlobalStats(), listSessionOverviews()]);
  return <GlobalDashboard stats={stats} sessions={sessions} />;
}
