import { jwtVerify, SignJWT } from "jose";
import { AUTH_COOKIE_MAX_AGE_SEC, authCookieOptions } from "./cookie-options";
import { secretKey } from "./secret";

export function adminCookieName(code: string): string {
  return `wc_admin_${code}`;
}

export const adminCookieOptions = authCookieOptions;

export async function sealAdminToken(code: string): Promise<string> {
  return new SignJWT({ code, scope: "session-admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_COOKIE_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifyAdminToken(token: string | undefined, code: string): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.code === code && payload.scope === "session-admin";
  } catch {
    return false;
  }
}
