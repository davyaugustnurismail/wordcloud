import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyGlobalPassword } from "@/lib/app-settings";
import { GLOBAL_COOKIE_NAME, globalCookieOptions, sealGlobalToken } from "@/lib/auth/global-cookie";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const limit = await hitRateLimit(`glogin:${clientIp(request.headers)}`, 10, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !(await verifyGlobalPassword(body.data.password))) {
    return NextResponse.json({ error: "credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(GLOBAL_COOKIE_NAME, await sealGlobalToken(), globalCookieOptions());
  return response;
}
