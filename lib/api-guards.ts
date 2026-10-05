import { NextResponse } from "next/server";
import { hasAdminAccess, hasGlobalAccess } from "./auth/access";
import { isValidCode, normalizeCode } from "./code";
import { findSessionByCode, type SessionRecord } from "./sessions";

export function jsonError(error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

export async function requireGlobal(): Promise<NextResponse | null> {
  return (await hasGlobalAccess()) ? null : jsonError("unauthorized", 401);
}

export async function requireSessionAdmin(
  rawCode: string,
): Promise<{ session: SessionRecord; error?: undefined } | { session?: undefined; error: NextResponse }> {
  const code = normalizeCode(rawCode);
  if (!isValidCode(code)) return { error: jsonError("not_found", 404) };
  if (!(await hasAdminAccess(code))) return { error: jsonError("unauthorized", 401) };
  const session = await findSessionByCode(code);
  if (!session) return { error: jsonError("not_found", 404) };
  return { session };
}
