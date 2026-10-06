import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";
import { secretKey } from "./secret";

const ADMIN_AUDIENCE = "pin-vault";
const INPUT_AUDIENCE = "input-pin-vault";

const adminPinPattern = /^\d{6}$/;
const inputPinPattern = /^\d{4,6}$/;

async function seal(pin: string, audience: string): Promise<string> {
  return new EncryptJWT({ pin })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setAudience(audience)
    .encrypt(secretKey());
}

async function open(token: string | null | undefined, audience: string, pattern: RegExp): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, secretKey(), { audience });
    const parsed = z.object({ pin: z.string().regex(pattern) }).safeParse(payload);
    return parsed.success ? parsed.data.pin : null;
  } catch {
    return null;
  }
}

export const sealPin = (pin: string) => seal(pin, ADMIN_AUDIENCE);
export const openPin = (token: string | null | undefined) => open(token, ADMIN_AUDIENCE, adminPinPattern);
export const sealInputPin = (pin: string) => seal(pin, INPUT_AUDIENCE);
export const openInputPin = (token: string | null | undefined) => open(token, INPUT_AUDIENCE, inputPinPattern);
