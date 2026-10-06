import { NextResponse, type NextRequest } from "next/server";
import { loginWithGoogle } from "@/lib/admin-users";
import { GLOBAL_COOKIE_NAME, globalCookieOptions, sealGlobalToken } from "@/lib/auth/global-cookie";
import { exchangeCodeForProfile, GoogleAuthError, OAUTH_COOKIE_NAME, oauthCookieOptions, openOAuthState } from "@/lib/auth/google";
import { getEnv, getGoogleConfig } from "@/lib/env";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function loginRedirect(error: string) {
  const response = NextResponse.redirect(new URL(`/admin/login?error=${error}`, getEnv().PUBLIC_URL));
  response.cookies.set(OAUTH_COOKIE_NAME, "", { ...oauthCookieOptions(), maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const limit = await hitRateLimit(`gcallback:${clientIp(request.headers)}`, 20, 60);
  if (!limit.allowed) return loginRedirect("rate_limited");

  const config = getGoogleConfig();
  if (!config) return loginRedirect("google_unavailable");

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return loginRedirect("google_denied");

  const code = params.get("code");
  const state = params.get("state");
  const saved = await openOAuthState(request.cookies.get(OAUTH_COOKIE_NAME)?.value);
  if (!code || !state || !saved || saved.state !== state) return loginRedirect("google_failed");

  try {
    const profile = await exchangeCodeForProfile(config, { code, verifier: saved.verifier, nonce: saved.nonce });
    const result = await loginWithGoogle(profile);
    if (result.status !== "ok") {
      return loginRedirect(
        result.status === "not_registered" ? "google_not_registered" : result.status === "inactive" ? "google_inactive" : "google_failed",
      );
    }

    const response = NextResponse.redirect(new URL("/admin", getEnv().PUBLIC_URL));
    response.cookies.set(GLOBAL_COOKIE_NAME, await sealGlobalToken(result.user.id), globalCookieOptions());
    response.cookies.set(OAUTH_COOKIE_NAME, "", { ...oauthCookieOptions(), maxAge: 0 });
    return response;
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return loginRedirect(err.reason === "unverified" ? "google_unverified" : "google_failed");
    }
    console.error(`[google] ${(err as Error).message}`);
    return loginRedirect("google_failed");
  }
}
