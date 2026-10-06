import { NextResponse } from "next/server";
import { isValidCode, normalizeCode } from "@/lib/code";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";
import { checkSlugAvailability, findSessionByCode } from "@/lib/sessions";
import { slugProblem } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const limit = await hitRateLimit(`slug:${clientIp(request.headers)}`, 60, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const slug = (await context.params).slug.toLowerCase();
  const problem = slugProblem(slug);
  if (problem) return NextResponse.json({ available: false, reason: problem });

  const code = normalizeCode(new URL(request.url).searchParams.get("code") ?? "");
  const own = isValidCode(code) ? await findSessionByCode(code) : null;
  const check = await checkSlugAvailability(slug, own?.id);
  return NextResponse.json(check.available ? { available: true } : { available: false, reason: check.reason });
}
