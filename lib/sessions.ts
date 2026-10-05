import { randomInt } from "node:crypto";
import { argon2id, hash, verify } from "argon2";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { CODE_ALPHABET, CODE_LENGTH } from "./code";
import { getDb } from "./db";
import { appSettings, blockedTerms, entries, sessions } from "./db/schema";
import { getEnv } from "./env";
import type { EntryDto } from "./realtime/events";
import { parseSettings, type SessionSettings } from "./settings";

export type SessionRecord = {
  id: string;
  code: string;
  name: string;
  status: "active" | "ended";
  settings: SessionSettings;
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
  };
}

function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string; cause?: { code?: string } } | null);
  return code?.code === "23505" || code?.cause?.code === "23505";
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

export async function listVisibleEntries(sessionId: string, limit: number): Promise<EntryDto[]> {
  const rows = await getDb()
    .select({ id: entries.id, text: entries.text, shownAt: entries.shownAt })
    .from(entries)
    .where(and(eq(entries.sessionId, sessionId), eq(entries.status, "visible")))
    .orderBy(desc(entries.shownAt), desc(entries.id))
    .limit(limit);

  return rows.map((row) => ({ id: row.id, text: row.text, shownAt: (row.shownAt ?? new Date(0)).getTime() }));
}

export async function insertVisibleEntry(input: {
  sessionId: string;
  text: string;
  normalized: string;
  deviceId: string | null;
}): Promise<EntryDto> {
  const [row] = await getDb()
    .insert(entries)
    .values({
      sessionId: input.sessionId,
      text: input.text,
      normalized: input.normalized,
      status: "visible",
      shownAt: new Date(),
      deviceId: input.deviceId,
    })
    .returning({ id: entries.id, text: entries.text, shownAt: entries.shownAt });
  if (!row) throw new Error("Kata gagal disimpan");
  return { id: row.id, text: row.text, shownAt: (row.shownAt ?? new Date()).getTime() };
}

export async function isTermBlocked(sessionId: string, normalized: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: blockedTerms.id })
    .from(blockedTerms)
    .where(
      and(eq(blockedTerms.term, normalized), or(isNull(blockedTerms.sessionId), eq(blockedTerms.sessionId, sessionId))),
    )
    .limit(1);
  return Boolean(row);
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
