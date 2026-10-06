import { GlobalUsers } from "@/components/global/global-users";
import { listAdminUsers } from "@/lib/admin-users";
import { getGlobalAccess } from "@/lib/auth/access";
import { getGoogleConfig } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function GlobalUsersPage() {
  const [users, access] = await Promise.all([listAdminUsers(), getGlobalAccess()]);
  return <GlobalUsers initialUsers={users} currentUserId={access?.userId ?? null} googleEnabled={getGoogleConfig() !== null} />;
}
