import { getEnv } from "../env";

export const AUTH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24;

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getEnv().PUBLIC_URL.startsWith("https"),
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SEC,
  };
}
