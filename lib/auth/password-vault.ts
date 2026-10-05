import { EncryptJWT, jwtDecrypt } from "jose";
import { z } from "zod";
import { secretKey } from "./secret";

const AUDIENCE = "password-vault";

const payloadSchema = z.object({ password: z.string().min(1) });

export async function sealPassword(password: string): Promise<string> {
  return new EncryptJWT({ password })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setAudience(AUDIENCE)
    .encrypt(secretKey());
}

export async function openPassword(token: unknown): Promise<string | null> {
  if (typeof token !== "string" || !token) return null;
  try {
    const { payload } = await jwtDecrypt(token, secretKey(), { audience: AUDIENCE });
    const parsed = payloadSchema.safeParse(payload);
    return parsed.success ? parsed.data.password : null;
  } catch {
    return null;
  }
}
