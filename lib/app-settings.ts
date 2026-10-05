import { hash, argon2id, verify } from "argon2";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { appSettings } from "./db/schema";
import { getEnv } from "./env";
import { sessionDefaultsSchema, type SessionDefaults } from "./settings";

const SESSION_DEFAULTS_KEY = "session_defaults";
const CREATOR_PASSWORD_KEY = "creator_password_hash";

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

export async function verifyCreatorPassword(password: string): Promise<boolean> {
  const stored = await readSetting(CREATOR_PASSWORD_KEY);
  const storedHash = typeof stored === "string" ? stored : getEnv().CREATOR_PASSWORD_HASH;
  try {
    return await verify(storedHash, password);
  } catch {
    return false;
  }
}

export async function setCreatorPassword(password: string): Promise<void> {
  await writeSetting(CREATOR_PASSWORD_KEY, await hash(password, { type: argon2id }));
}

export async function verifyGlobalPassword(password: string): Promise<boolean> {
  try {
    return await verify(getEnv().ADMIN_PASSWORD_HASH, password);
  } catch {
    return false;
  }
}
