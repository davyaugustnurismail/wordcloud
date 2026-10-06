import { cookies } from "next/headers";
import { findSessionByCode, type SessionRecord } from "../sessions";
import { adminCookieName, verifyAdminToken } from "./admin-cookie";
import { GLOBAL_COOKIE_NAME } from "./global-cookie";
import { resolveGlobalAccess, type GlobalAccess } from "./global-access";
import { inputCookieName, verifyInputToken } from "./input-cookie";
import { openReadyToken, readyCookieName, type ReadyPayload } from "./ready-cookie";

export async function getGlobalAccess(): Promise<GlobalAccess | null> {
  const store = await cookies();
  return resolveGlobalAccess(store.get(GLOBAL_COOKIE_NAME)?.value);
}

export async function hasGlobalAccess(): Promise<boolean> {
  return (await getGlobalAccess()) !== null;
}

export async function hasAdminAccess(code: string): Promise<boolean> {
  if (await hasGlobalAccess()) return true;
  const session = await findSessionByCode(code);
  if (!session) return false;
  const store = await cookies();
  return verifyAdminToken(store.get(adminCookieName(code))?.value, code, session.adminEpoch);
}

export async function hasInputAccess(session: SessionRecord): Promise<boolean> {
  if (!session.inputPinEnabled) return true;
  const store = await cookies();
  return verifyInputToken(store.get(inputCookieName(session.code))?.value, session.code, session.inputEpoch);
}

export async function getReadyAccess(code: string): Promise<ReadyPayload | null> {
  const store = await cookies();
  return openReadyToken(store.get(readyCookieName(code))?.value, code);
}
