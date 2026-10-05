import { NextResponse } from "next/server";
import { z } from "zod";
import { readyCookieName, readyCookieOptions, sealReadyToken } from "@/lib/auth/ready-cookie";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";
import { createSession, verifyCreatorPassword } from "@/lib/sessions";
import { defaultSettings, inputThemes, photowallThemes } from "@/lib/settings";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
  photowallTheme: z.enum(photowallThemes),
  inputTheme: z.enum(inputThemes),
  prompt: z.string().trim().min(1).max(80),
  maxChars: z.coerce.number().int().min(3).max(40),
});

export async function POST(request: Request) {
  const limit = await hitRateLimit(`create:${clientIp(request.headers)}`, 10, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const form = await request.formData().catch(() => null);
  const parsed = createSchema.safeParse(form ? Object.fromEntries(form) : {});
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;
  if (!(await verifyCreatorPassword(password))) {
    return NextResponse.json({ error: "password" }, { status: 401 });
  }

  const { session, pin } = await createSession({
    name: rest.name,
    settings: {
      ...defaultSettings(),
      photowallTheme: rest.photowallTheme,
      inputTheme: rest.inputTheme,
      prompt: rest.prompt,
      maxChars: rest.maxChars,
    },
  });

  const response = NextResponse.json({ code: session.code }, { status: 201 });
  response.cookies.set(
    readyCookieName(session.code),
    await sealReadyToken({ code: session.code, pin }),
    readyCookieOptions(),
  );
  return response;
}
