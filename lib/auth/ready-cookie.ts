import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";
import { getEnv } from "../env";

export const READY_COOKIE_MAX_AGE_SEC = 60 * 60 * 24;

const payloadSchema = z.object({
  code: z.string(),
  pin: z.string(),
});

export type ReadyPayload = z.infer<typeof payloadSchema>;

export function readyCookieName(code: string): string {
  return `wc_ready_${code}`;
}

export function readyCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getEnv().PUBLIC_URL.startsWith("https"),
    path: "/",
    maxAge: READY_COOKIE_MAX_AGE_SEC,
  };
}

function secretKey(): Uint8Array {
  return createHash("sha256").update(getEnv().AUTH_SECRET).digest();
}

export async function sealReadyToken(payload: ReadyPayload): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${READY_COOKIE_MAX_AGE_SEC}s`)
    .encrypt(secretKey());
}

export async function openReadyToken(token: string | undefined, code: string): Promise<ReadyPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, secretKey());
    const parsed = payloadSchema.safeParse(payload);
    if (!parsed.success || parsed.data.code !== code) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
