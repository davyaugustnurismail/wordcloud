import { cookies } from "next/headers";
import { adminCookieName, verifyAdminToken } from "./admin-cookie";
import { openReadyToken, readyCookieName, type ReadyPayload } from "./ready-cookie";

export async function hasAdminAccess(code: string): Promise<boolean> {
  const store = await cookies();
  return verifyAdminToken(store.get(adminCookieName(code))?.value, code);
}

export async function getReadyAccess(code: string): Promise<ReadyPayload | null> {
  const store = await cookies();
  return openReadyToken(store.get(readyCookieName(code))?.value, code);
}
