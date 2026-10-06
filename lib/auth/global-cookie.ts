import { jwtVerify, SignJWT } from "jose";
import { AUTH_COOKIE_MAX_AGE_SEC, authCookieOptions } from "./cookie-options";
import { secretKey } from "./secret";

export const GLOBAL_COOKIE_NAME = "wc_global";

export const globalCookieOptions = authCookieOptions;

export type GlobalTokenClaims = { userId: string | null };

export async function sealGlobalToken(userId?: string): Promise<string> {
  return new SignJWT({ scope: "global-admin", ...(userId ? { uid: userId } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_COOKIE_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function readGlobalToken(token: string | undefined): Promise<GlobalTokenClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (payload.scope !== "global-admin") return null;
    return { userId: typeof payload.uid === "string" ? payload.uid : null };
  } catch {
    return null;
  }
}
