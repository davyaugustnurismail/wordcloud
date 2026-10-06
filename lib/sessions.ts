import { randomInt, timingSafeEqual } from "node:crypto";
import { argon2id, hash, verify } from "argon2";
import { and, eq, ne, sql } from "drizzle-orm";
import { openInputPin, openPin, sealInputPin, sealPin } from "./auth/pin-vault";
import { CODE_ALPHABET, CODE_LENGTH, isValidCode, normalizeCode } from "./code";
import { getDb } from "./db";
import { sessions } from "./db/schema";
import type { ControlAction, SessionState } from "./realtime/events";
import { parseSettings, type SessionSettings } from "./settings";
import { slugify, slugProblem, SLUG_MAX_LENGTH, SLUG_MIN_LENGTH } from "./slug";

export type SessionRecord = {
  id: string;
  code: string;
  slug: string | null;
  name: string;
  status: "active" | "ended";
  adminEpoch: number;
  inputPinEnabled: boolean;
  inputEpoch: number;
  settings: SessionSettings;
  state: SessionState;
};

const MAX_CODE_ATTEMPTS = 8;
const MAX_SLUG_ATTEMPTS = 50;
const INPUT_PIN_DEFAULT_LENGTH = 4;
const FALLBACK_SLUG = "sesi";

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

export function generateInputPin(length = INPUT_PIN_DEFAULT_LENGTH): string {
  return String(randomInt(0, 10 ** length)).padStart(length, "0");
}

export function sessionRef(session: { code: string; slug: string | null }): string {
  return session.slug ?? session.code;
}

function toRecord(row: typeof sessions.$inferSelect): SessionRecord {
  return {
    id: row.id,
    code: row.code,
    slug: row.slug,
    name: row.name,
    status: row.status,
    adminEpoch: row.adminEpoch,
    inputPinEnabled: row.inputPinEnabled,
    inputEpoch: row.inputEpoch,
    settings: parseSettings(row.settings),
    state: {
      paused: row.paused,
      frozen: row.frozen,
      ended: row.status === "ended",
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

export async function findSessionBySlug(slug: string): Promise<SessionRecord | null> {
  const [row] = await getDb().select().from(sessions).where(eq(sessions.slug, slug)).limit(1);
  return row ? toRecord(row) : null;
}

export async function findSessionByRef(ref: string): Promise<SessionRecord | null> {
  const decoded = ref.trim();
  if (/^[A-Z2-9]{6}$/.test(decoded) && isValidCode(decoded)) {
    const byCode = await findSessionByCode(decoded);
    if (byCode) return byCode;
  }
  const lowered = decoded.toLowerCase();
  if (slugProblem(lowered) === null) {
    const bySlug = await findSessionBySlug(lowered);
    if (bySlug) return bySlug;
  }
  const code = normalizeCode(decoded);
  return isValidCode(code) ? findSessionByCode(code) : null;
}

export async function findSessionById(id: string): Promise<SessionRecord | null> {
  const [row] = await getDb().select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return row ? toRecord(row) : null;
}

export type SlugCheck = { available: true } | { available: false; reason: "taken" | "code" };

export async function checkSlugAvailability(slug: string, exceptSessionId?: string): Promise<SlugCheck> {
  const db = getDb();
  const [codeClash] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(sql`upper(${sessions.code}) = upper(${slug})`)
    .limit(1);
  if (codeClash) return { available: false, reason: "code" };

  const [taken] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(exceptSessionId ? and(eq(sessions.slug, slug), ne(sessions.id, exceptSessionId)) : eq(sessions.slug, slug))
    .limit(1);
  return taken ? { available: false, reason: "taken" } : { available: true };
}

export async function generateUniqueSlug(name: string): Promise<string> {
  let base = slugify(name);
  if (base.length < SLUG_MIN_LENGTH) base = FALLBACK_SLUG;

  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
    const suffix = attempt === 1 ? "" : `-${attempt}`;
    const candidate = `${base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (slugProblem(candidate) === null && (await checkSlugAvailability(candidate)).available) return candidate;
  }
  return `${FALLBACK_SLUG}-${generateCode().toLowerCase()}`;
}

export class SlugTakenError extends Error {
  constructor() {
    super("Alamat sesi sudah dipakai");
  }
}

export async function createSession(input: {
  name: string;
  slug?: string | null;
  settings: SessionSettings;
}): Promise<{ session: SessionRecord; pin: string }> {
  const pin = generatePin();
  const pinHash = await hash(pin, { type: argon2id });
  const pinEncrypted = await sealPin(pin);
  const slug = input.slug ?? (await generateUniqueSlug(input.name));

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    try {
      const [row] = await getDb()
        .insert(sessions)
        .values({ code: generateCode(), slug, name: input.name, pinHash, pinEncrypted, settings: input.settings })
        .returning();
      if (!row) throw new Error("Sesi gagal dibuat");
      return { session: toRecord(row), pin };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (await findSessionBySlug(slug)) throw new SlugTakenError();
    }
  }
  throw new Error("Gagal membuat kode sesi yang unik");
}

export async function updateSessionSlug(sessionId: string, slug: string): Promise<SessionRecord> {
  try {
    const [row] = await getDb().update(sessions).set({ slug }).where(eq(sessions.id, sessionId)).returning();
    if (!row) throw new Error("Sesi tidak ditemukan");
    return toRecord(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw new SlugTakenError();
    throw err;
  }
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
  if (action === "end") {
    patch.status = "ended";
    patch.endedAt = new Date();
  }

  const [row] = await getDb().update(sessions).set(patch).where(eq(sessions.id, sessionId)).returning();
  if (!row) throw new Error("Sesi tidak ditemukan");
  return toRecord(row).state;
}

export async function resetSessionPin(sessionId: string): Promise<string> {
  const pin = generatePin();
  const pinHash = await hash(pin, { type: argon2id });
  const pinEncrypted = await sealPin(pin);
  const [row] = await getDb()
    .update(sessions)
    .set({ pinHash, pinEncrypted, adminEpoch: sql`${sessions.adminEpoch} + 1` })
    .where(eq(sessions.id, sessionId))
    .returning({ id: sessions.id });
  if (!row) throw new Error("Sesi tidak ditemukan");
  return pin;
}

export async function readStoredPin(sessionId: string): Promise<string | null | undefined> {
  const [row] = await getDb()
    .select({ pinEncrypted: sessions.pinEncrypted })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  if (!row) return undefined;
  return openPin(row.pinEncrypted);
}

export type InputAccessState = { enabled: boolean; pin: string | null };

export async function readInputAccess(sessionId: string): Promise<InputAccessState | null> {
  const [row] = await getDb()
    .select({ enabled: sessions.inputPinEnabled, encrypted: sessions.inputPinEncrypted })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  if (!row) return null;
  return { enabled: row.enabled, pin: await openInputPin(row.encrypted) };
}

export async function verifyInputPin(sessionId: string, pin: string): Promise<boolean> {
  const access = await readInputAccess(sessionId);
  if (!access?.enabled || !access.pin) return false;
  const expected = Buffer.from(access.pin);
  const given = Buffer.from(pin);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function updateInputAccess(
  sessionId: string,
  change: { enabled?: boolean; pin?: string; regenerate?: boolean },
): Promise<InputAccessState | null> {
  const current = await readInputAccess(sessionId);
  if (!current) return null;

  const enabled = change.enabled ?? current.enabled;
  let pin = current.pin;
  let pinChanged = false;
  if (change.pin !== undefined) {
    pin = change.pin;
    pinChanged = pin !== current.pin;
  } else if (change.regenerate || (enabled && !pin)) {
    pin = generateInputPin();
    pinChanged = true;
  }

  const rotates = pinChanged || (enabled && !current.enabled);
  await getDb()
    .update(sessions)
    .set({
      inputPinEnabled: enabled,
      inputPinEncrypted: pin ? await sealInputPin(pin) : null,
      ...(rotates ? { inputEpoch: sql`${sessions.inputEpoch} + 1` } : {}),
    })
    .where(eq(sessions.id, sessionId));
  return { enabled, pin };
}
