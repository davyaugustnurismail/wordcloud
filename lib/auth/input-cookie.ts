import { jwtVerify, SignJWT } from "jose";
import { AUTH_COOKIE_MAX_AGE_SEC, authCookieOptions } from "./cookie-options";
import { secretKey } from "./secret";

export function inputCookieName(code: string): string {
  return `wc_input_${code}`;
}

export const inputCookieOptions = authCookieOptions;

export async function sealInputToken(code: string, epoch: number): Promise<string> {
  return new SignJWT({ code, epoch, scope: "input-access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_COOKIE_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifyInputToken(token: string | undefined, code: string, epoch: number): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.code === code && payload.epoch === epoch && payload.scope === "input-access";
  } catch {
    return false;
  }
}
