import { NextResponse } from "next/server";
import { adminCookieName, adminCookieOptions, sealAdminToken } from "@/lib/auth/admin-cookie";
import { getReadyAccess } from "@/lib/auth/access";
import { isValidCode, normalizeCode } from "@/lib/code";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await context.params).code);
  const ready = isValidCode(code) ? await getReadyAccess(code) : null;
  if (!ready) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, code });
  response.cookies.set(adminCookieName(code), await sealAdminToken(code), adminCookieOptions());
  return response;
}
