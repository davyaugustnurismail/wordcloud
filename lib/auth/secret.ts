import { createHash } from "node:crypto";
import { getEnv } from "../env";

export function secretKey(): Uint8Array {
  return createHash("sha256").update(getEnv().AUTH_SECRET).digest();
}
