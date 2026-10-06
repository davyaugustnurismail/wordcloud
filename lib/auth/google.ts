import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, EncryptJWT, jwtDecrypt, jwtVerify } from "jose";
import { z } from "zod";
import type { GoogleProfile } from "../admin-users";
import { getEnv, type GoogleConfig } from "../env";
import { secretKey } from "./secret";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const AUDIENCE = "google-oauth";
const REQUEST_TIMEOUT_MS = 10_000;

export const OAUTH_COOKIE_NAME = "wc_oauth";
export const OAUTH_COOKIE_MAX_AGE_SEC = 600;
export const OAUTH_COOKIE_PATH = "/api/auth/google";

export function oauthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getEnv().PUBLIC_URL.startsWith("https"),
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE_SEC,
  };
}

export class GoogleAuthError extends Error {
  constructor(readonly reason: "state" | "token" | "profile" | "unverified") {
    super(`google_${reason}`);
  }
}

const statePayloadSchema = z.object({ state: z.string(), nonce: z.string(), verifier: z.string() });

export type OAuthState = z.infer<typeof statePayloadSchema>;

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

export function createOAuthState(): OAuthState & { challenge: string } {
  const verifier = base64Url(randomBytes(48));
  return {
    state: base64Url(randomBytes(24)),
    nonce: base64Url(randomBytes(24)),
    verifier,
    challenge: base64Url(createHash("sha256").update(verifier).digest()),
  };
}

export async function sealOAuthState(payload: OAuthState): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${OAUTH_COOKIE_MAX_AGE_SEC}s`)
    .encrypt(secretKey());
}

export async function openOAuthState(token: string | undefined): Promise<OAuthState | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, secretKey(), { audience: AUDIENCE });
    const parsed = statePayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function buildAuthUrl(config: GoogleConfig, input: { state: string; nonce: string; challenge: string }): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

const tokenResponseSchema = z.object({ id_token: z.string().min(1) });

const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().min(3),
  email_verified: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
  name: z.string().optional(),
  nonce: z.string().optional(),
});

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function keySet() {
  jwks ??= createRemoteJWKSet(new URL(JWKS_URL));
  return jwks;
}

export async function verifyIdToken(idToken: string, config: GoogleConfig, nonce: string): Promise<GoogleProfile> {
  let payload: unknown;
  try {
    ({ payload } = await jwtVerify(idToken, keySet(), { issuer: ISSUERS, audience: config.clientId }));
  } catch {
    throw new GoogleAuthError("token");
  }

  const claims = claimsSchema.safeParse(payload);
  if (!claims.success || claims.data.nonce !== nonce) throw new GoogleAuthError("profile");
  if (claims.data.email_verified !== true && claims.data.email_verified !== "true") throw new GoogleAuthError("unverified");

  return { sub: claims.data.sub, email: claims.data.email, name: claims.data.name ?? null };
}

export async function exchangeCodeForProfile(
  config: GoogleConfig,
  input: { code: string; verifier: string; nonce: string },
): Promise<GoogleProfile> {
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: input.code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
        code_verifier: input.verifier,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GoogleAuthError("token");
  }
  if (!response.ok) throw new GoogleAuthError("token");

  const body = tokenResponseSchema.safeParse(await response.json().catch(() => null));
  if (!body.success) throw new GoogleAuthError("token");
  return verifyIdToken(body.data.id_token, config, input.nonce);
}
