import { jwtVerify, SignJWT } from "jose";
import { AUTH_COOKIE_MAX_AGE_SEC, authCookieOptions } from "./cookie-options";
import { secretKey } from "./secret";

export const GLOBAL_COOKIE_NAME = "wc_global";

export const globalCookieOptions = authCookieOptions;

export async function sealGlobalToken(): Promise<string> {
  return new SignJWT({ scope: "global-admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_COOKIE_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifyGlobalToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.scope === "global-admin";
  } catch {
    return false;
  }
}
