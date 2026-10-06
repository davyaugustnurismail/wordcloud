import { findAdminUser } from "../admin-users";
import { readGlobalToken } from "./global-cookie";

export type GlobalAccess = { userId: string | null; email: string | null; name: string | null };

export async function resolveGlobalAccess(token: string | undefined): Promise<GlobalAccess | null> {
  const claims = await readGlobalToken(token);
  if (!claims) return null;
  if (!claims.userId) return { userId: null, email: null, name: null };

  const user = await findAdminUser(claims.userId);
  if (!user || !user.active) return null;
  return { userId: user.id, email: user.email, name: user.name };
}
