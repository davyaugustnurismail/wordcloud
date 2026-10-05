import { cookies } from "next/headers";
import { findSessionByCode } from "../sessions";
import { adminCookieName, verifyAdminToken } from "./admin-cookie";
import { GLOBAL_COOKIE_NAME, verifyGlobalToken } from "./global-cookie";
import { openReadyToken, readyCookieName, type ReadyPayload } from "./ready-cookie";

export async function hasGlobalAccess(): Promise<boolean> {
  const store = await cookies();
  return verifyGlobalToken(store.get(GLOBAL_COOKIE_NAME)?.value);
}

export async function hasAdminAccess(code: string): Promise<boolean> {
  if (await hasGlobalAccess()) return true;
  const session = await findSessionByCode(code);
  if (!session) return false;
  const store = await cookies();
  return verifyAdminToken(store.get(adminCookieName(code))?.value, code, session.adminEpoch);
}

export async function getReadyAccess(code: string): Promise<ReadyPayload | null> {
  const store = await cookies();
  return openReadyToken(store.get(readyCookieName(code))?.value, code);
}
