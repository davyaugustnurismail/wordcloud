import { NextResponse } from "next/server";
import { isValidCode, normalizeCode } from "@/lib/code";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";
import { findSessionByCode, sessionRef } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const limit = await hitRateLimit(`lookup:${clientIp(request.headers)}`, 30, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const { code: rawCode } = await context.params;
  const code = normalizeCode(rawCode);
  const session = isValidCode(code) ? await findSessionByCode(code) : null;
  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, code: session.code, ref: sessionRef(session) });
}
