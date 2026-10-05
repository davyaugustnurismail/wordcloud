import { headers } from "next/headers";
import { getEnv } from "./env";

export async function resolveRequestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return getEnv().PUBLIC_URL;
  const fallbackProtocol = getEnv().PUBLIC_URL.startsWith("https") ? "https" : "http";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? fallbackProtocol;
  return `${protocol}://${host}`;
}
