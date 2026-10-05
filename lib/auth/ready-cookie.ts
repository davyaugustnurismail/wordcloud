import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";
import { AUTH_COOKIE_MAX_AGE_SEC, authCookieOptions } from "./cookie-options";
import { secretKey } from "./secret";

const payloadSchema = z.object({
  code: z.string(),
  pin: z.string(),
});

export type ReadyPayload = z.infer<typeof payloadSchema>;

export function readyCookieName(code: string): string {
  return `wc_ready_${code}`;
}

export const readyCookieOptions = authCookieOptions;

export async function sealReadyToken(payload: ReadyPayload): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_COOKIE_MAX_AGE_SEC}s`)
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
