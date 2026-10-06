import { NextResponse } from "next/server";
import { z } from "zod";
import { inputCookieName, inputCookieOptions, sealInputToken } from "@/lib/auth/input-cookie";
import { isValidCode, normalizeCode } from "@/lib/code";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";
import { findSessionByCode, verifyInputPin } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ pin: z.string().regex(/^\d{4,6}$/) });

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const limit = await hitRateLimit(`inpin:${clientIp(request.headers)}`, 10, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const code = normalizeCode((await context.params).code);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  const session = isValidCode(code) ? await findSessionByCode(code) : null;
  if (!body.success || !session) return NextResponse.json({ error: "credentials" }, { status: 401 });

  if (session.inputPinEnabled && !(await verifyInputPin(session.id, body.data.pin))) {
    return NextResponse.json({ error: "credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(inputCookieName(session.code), await sealInputToken(session.code, session.inputEpoch), inputCookieOptions());
  return response;
}
