import { hash, argon2id, verify } from "argon2";
import { eq } from "drizzle-orm";
import { openPassword, sealPassword } from "./auth/password-vault";
import { getDb } from "./db";
import { appSettings } from "./db/schema";
import { getEnv } from "./env";
import { sessionDefaultsSchema, type SessionDefaults } from "./settings";

const SESSION_DEFAULTS_KEY = "session_defaults";

async function readSetting(key: string): Promise<unknown> {
  const [row] = await getDb().select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return row?.value;
}

async function writeSetting(key: string, value: unknown): Promise<void> {
  await getDb()
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

export async function getSessionDefaults(): Promise<SessionDefaults> {
  const parsed = sessionDefaultsSchema.safeParse((await readSetting(SESSION_DEFAULTS_KEY)) ?? {});
  return parsed.success ? parsed.data : sessionDefaultsSchema.parse({});
}

export async function saveSessionDefaults(defaults: SessionDefaults): Promise<void> {
  await writeSetting(SESSION_DEFAULTS_KEY, defaults);
}

export type PasswordTarget = "creator" | "global";

const passwordKeys = {
  creator: { hash: "creator_password_hash", sealed: "creator_password_sealed" },
  global: { hash: "global_password_hash", sealed: "global_password_sealed" },
} as const;

function envPasswordHash(target: PasswordTarget): string {
  const env = getEnv();
  return target === "creator" ? env.CREATOR_PASSWORD_HASH : env.ADMIN_PASSWORD_HASH;
}

async function verifyPassword(target: PasswordTarget, password: string): Promise<boolean> {
  const stored = await readSetting(passwordKeys[target].hash);
  const storedHash = typeof stored === "string" ? stored : envPasswordHash(target);
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}

export async function setPassword(target: PasswordTarget, password: string): Promise<void> {
  await writeSetting(passwordKeys[target].hash, await hash(password, { type: argon2id }));
  await writeSetting(passwordKeys[target].sealed, await sealPassword(password));
}

export async function readStoredPassword(target: PasswordTarget): Promise<string | null> {
  return openPassword(await readSetting(passwordKeys[target].sealed));
}

export const verifyCreatorPassword = (password: string) => verifyPassword("creator", password);
export const verifyGlobalPassword = (password: string) => verifyPassword("global", password);
