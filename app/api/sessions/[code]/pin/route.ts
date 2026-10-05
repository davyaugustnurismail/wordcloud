import { NextResponse } from "next/server";
import { z } from "zod";
import { adminCookieName, adminCookieOptions, sealAdminToken } from "@/lib/auth/admin-cookie";
import { isValidCode, normalizeCode } from "@/lib/code";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";
import { checkSessionPin } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  pin: z.string().transform((value) => value.replace(/\s/g, "")).pipe(z.string().regex(/^\d{6}$/)),
});

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const limit = await hitRateLimit(`pin:${clientIp(request.headers)}`, 10, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const code = normalizeCode((await context.params).code);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !isValidCode(code)) {
    return NextResponse.json({ error: "credentials" }, { status: 401 });
  }

  const session = await checkSessionPin(code, body.data.pin);
  if (!session) {
    return NextResponse.json({ error: "credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, code: session.code });
  response.cookies.set(adminCookieName(session.code), await sealAdminToken(session.code, session.adminEpoch), adminCookieOptions());
  return response;
}
