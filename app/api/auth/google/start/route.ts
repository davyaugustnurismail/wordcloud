import { NextResponse } from "next/server";
import { buildAuthUrl, createOAuthState, OAUTH_COOKIE_NAME, oauthCookieOptions, sealOAuthState } from "@/lib/auth/google";
import { getEnv, getGoogleConfig } from "@/lib/env";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function loginRedirect(error: string) {
  return NextResponse.redirect(new URL(`/admin/login?error=${error}`, getEnv().PUBLIC_URL));
}

export async function GET(request: Request) {
  const limit = await hitRateLimit(`gstart:${clientIp(request.headers)}`, 20, 60);
  if (!limit.allowed) return loginRedirect("rate_limited");

  const config = getGoogleConfig();
  if (!config) return loginRedirect("google_unavailable");

  const challenge = createOAuthState();
  const response = NextResponse.redirect(buildAuthUrl(config, challenge));
  response.cookies.set(
    OAUTH_COOKIE_NAME,
    await sealOAuthState({ state: challenge.state, nonce: challenge.nonce, verifier: challenge.verifier }),
    oauthCookieOptions(),
  );
  return response;
}
