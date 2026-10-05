import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";
import { secretKey } from "./secret";

const AUDIENCE = "pin-vault";

const payloadSchema = z.object({ pin: z.string().regex(/^\d{6}$/) });

export async function sealPin(pin: string): Promise<string> {
  return new EncryptJWT({ pin })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setAudience(AUDIENCE)
    .encrypt(secretKey());
}

export async function openPin(token: string | null | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, secretKey(), { audience: AUDIENCE });
    const parsed = payloadSchema.safeParse(payload);
    return parsed.success ? parsed.data.pin : null;
  } catch {
    return null;
  }
}
