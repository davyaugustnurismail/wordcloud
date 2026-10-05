import { randomInt } from "node:crypto";
import { argon2id, hash, verify } from "argon2";
import { eq } from "drizzle-orm";
import { CODE_ALPHABET, CODE_LENGTH } from "./code";
import { getDb } from "./db";
import { appSettings, sessions } from "./db/schema";
import { getEnv } from "./env";
import type { ControlAction, SessionState } from "./realtime/events";
import { parseSettings, type SessionSettings } from "./settings";

export type SessionRecord = {
  id: string;
  code: string;
  name: string;
  status: "active" | "ended";
  settings: SessionSettings;
  state: SessionState;
};

const MAX_CODE_ATTEMPTS = 8;

export function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function toRecord(row: typeof sessions.$inferSelect): SessionRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    settings: parseSettings(row.settings),
    state: {
      paused: row.paused,
      frozen: row.frozen,
      clearedAt: row.clearedAt ? row.clearedAt.getTime() : null,
    },
  };
}

function isUniqueViolation(err: unknown): boolean {
  const error = err as { code?: string; cause?: { code?: string } } | null;
  return error?.code === "23505" || error?.cause?.code === "23505";
}

export async function findSessionByCode(code: string): Promise<SessionRecord | null> {
  const [row] = await getDb().select().from(sessions).where(eq(sessions.code, code)).limit(1);
  return row ? toRecord(row) : null;
}

export async function findSessionById(id: string): Promise<SessionRecord | null> {
  const [row] = await getDb().select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return row ? toRecord(row) : null;
}

export async function createSession(input: {
  name: string;
  settings: SessionSettings;
}): Promise<{ session: SessionRecord; pin: string }> {
  const pin = generatePin();
  const pinHash = await hash(pin, { type: argon2id });

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const [row] = await getDb()
        .insert(sessions)
        .values({ code: generateCode(), name: input.name, pinHash, settings: input.settings })
        .returning();
      if (!row) throw new Error("Sesi gagal dibuat");
      return { session: toRecord(row), pin };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new Error("Gagal membuat kode sesi yang unik");
}

export async function checkSessionPin(code: string, pin: string): Promise<SessionRecord | null> {
  const [row] = await getDb().select().from(sessions).where(eq(sessions.code, code)).limit(1);
  if (!row) return null;
  try {
    return (await verify(row.pinHash, pin)) ? toRecord(row) : null;
  } catch {
    return null;
  }
}

export async function updateSessionSettings(sessionId: string, settings: SessionSettings): Promise<SessionSettings> {
  const [row] = await getDb().update(sessions).set({ settings }).where(eq(sessions.id, sessionId)).returning();
  if (!row) throw new Error("Sesi tidak ditemukan");
  return parseSettings(row.settings);
}

export async function setModerationMode(sessionId: string, mode: SessionSettings["moderationMode"]): Promise<SessionSettings> {
  const current = await findSessionById(sessionId);
  if (!current) throw new Error("Sesi tidak ditemukan");
  const next: SessionSettings = { ...current.settings, moderationMode: mode };
  await getDb().update(sessions).set({ settings: next }).where(eq(sessions.id, sessionId));
  return next;
}

export async function applyControl(sessionId: string, action: ControlAction): Promise<SessionState> {
  const patch: Partial<typeof sessions.$inferInsert> = {};
  if (action === "pause") patch.paused = true;
  if (action === "resume") patch.paused = false;
  if (action === "freeze") patch.frozen = true;
  if (action === "unfreeze") patch.frozen = false;
  if (action === "clear") patch.clearedAt = new Date();

  const [row] = await getDb().update(sessions).set(patch).where(eq(sessions.id, sessionId)).returning();
  if (!row) throw new Error("Sesi tidak ditemukan");
  return toRecord(row).state;
}

export async function verifyCreatorPassword(password: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, "creator_password_hash"))
    .limit(1);
  const stored = typeof row?.value === "string" ? row.value : getEnv().CREATOR_PASSWORD_HASH;
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}
