import { and, asc, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import { entries, moderationLogs } from "./db/schema";
import type { AdminEntryDto, EntryDto } from "./realtime/events";

export type EntryRow = typeof entries.$inferSelect;

type ModerationAction = typeof moderationLogs.$inferInsert.action;

export function toAdminDto(row: EntryRow): AdminEntryDto {
  return {
    id: row.id,
    text: row.text,
    status: row.status,
    createdAt: row.createdAt.getTime(),
    shownAt: row.shownAt ? row.shownAt.getTime() : null,
    deviceId: row.deviceId,
  };
}

export function toEntryDto(row: EntryRow): EntryDto {
  return { id: row.id, text: row.text, shownAt: (row.shownAt ?? row.createdAt).getTime() };
}

async function logAction(entryId: string, action: ModerationAction, actor: string) {
  await getDb().insert(moderationLogs).values({ entryId, action, actor });
}

export async function listVisibleEntries(sessionId: string, clearedAt: number | null, limit: number): Promise<EntryDto[]> {
  const rows = await getDb()
    .select()
    .from(entries)
    .where(
      and(
        eq(entries.sessionId, sessionId),
        eq(entries.status, "visible"),
        isNotNull(entries.shownAt),
        clearedAt === null ? undefined : gt(entries.shownAt, new Date(clearedAt)),
      ),
    )
    .orderBy(desc(entries.shownAt), desc(entries.id))
    .limit(limit);
  return rows.map(toEntryDto);
}

export async function listAdminEntries(sessionId: string, limit: number): Promise<AdminEntryDto[]> {
  const rows = await getDb()
    .select()
    .from(entries)
    .where(eq(entries.sessionId, sessionId))
    .orderBy(desc(sql`coalesce(${entries.shownAt}, ${entries.createdAt})`), desc(entries.id))
    .limit(limit);
  return rows.map(toAdminDto);
}

export async function insertEntry(input: {
  sessionId: string;
  text: string;
  normalized: string;
  deviceId: string | null;
  status: "visible" | "pending";
}): Promise<EntryRow> {
  const [row] = await getDb()
    .insert(entries)
    .values({
      sessionId: input.sessionId,
      text: input.text,
      normalized: input.normalized,
      status: input.status,
      shownAt: input.status === "visible" ? new Date() : null,
      deviceId: input.deviceId,
    })
    .returning();
  if (!row) throw new Error("Kata gagal disimpan");
  return row;
}

type InsertedEntryRow = {
  id: string;
  session_id: string;
  text: string;
  normalized: string;
  status: EntryRow["status"];
  created_ms: number;
  shown_ms: number | null;
  device_id: string | null;
};

export async function insertEntryUnlessBlocked(input: {
  sessionId: string;
  text: string;
  normalized: string;
  blockKeys: string[];
  deviceId: string | null;
  status: "visible" | "pending";
}): Promise<EntryRow | null> {
  const shownAt = input.status === "visible" ? new Date() : null;
  const keys = input.blockKeys.filter(Boolean);
  const skeletonMatch =
    keys.length === 0 ? sql`` : sql` or b.skeleton in (${sql.join(keys.map((key) => sql`${key}::text`), sql`, `)})`;
  const result = await getDb().execute<InsertedEntryRow>(sql`
    insert into entries (session_id, text, normalized, status, shown_at, device_id)
    select ${input.sessionId}::uuid, ${input.text}::text, ${input.normalized}::text, ${input.status}::entry_status, ${shownAt}::timestamptz, ${input.deviceId}::text
    where not exists (
      select 1 from blocked_terms b
      where (b.term = ${input.normalized}::text${skeletonMatch})
        and (b.session_id is null or b.session_id = ${input.sessionId}::uuid)
    )
    returning id, session_id, text, normalized, status,
      (extract(epoch from created_at) * 1000)::float8 as created_ms,
      (extract(epoch from shown_at) * 1000)::float8 as shown_ms,
      device_id
  `);
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    text: row.text,
    normalized: row.normalized,
    status: row.status,
    createdAt: new Date(Number(row.created_ms)),
    shownAt: row.shown_ms === null ? null : new Date(Number(row.shown_ms)),
    deviceId: row.device_id,
  };
}

export async function approveEntries(sessionId: string, ids: string[], actor: string): Promise<EntryRow[]> {
  const pending = await getDb()
    .select()
    .from(entries)
    .where(and(eq(entries.sessionId, sessionId), inArray(entries.id, ids), eq(entries.status, "pending")))
    .orderBy(asc(entries.createdAt), asc(entries.id));

  const approved: EntryRow[] = [];
  let lastShownAt = 0;
  for (const row of pending) {
    lastShownAt = Math.max(Date.now(), lastShownAt + 1);
    const [updated] = await getDb()
      .update(entries)
      .set({ status: "visible", shownAt: new Date(lastShownAt) })
      .where(and(eq(entries.id, row.id), eq(entries.status, "pending")))
      .returning();
    if (updated) {
      await logAction(updated.id, "approve", actor);
      approved.push(updated);
    }
  }
  return approved;
}

async function transition(
  sessionId: string,
  id: string,
  from: EntryRow["status"],
  to: EntryRow["status"],
  action: ModerationAction,
  actor: string,
): Promise<EntryRow | null> {
  const [updated] = await getDb()
    .update(entries)
    .set({ status: to })
    .where(and(eq(entries.id, id), eq(entries.sessionId, sessionId), eq(entries.status, from)))
    .returning();
  if (!updated) return null;
  await logAction(updated.id, action, actor);
  return updated;
}

export function rejectEntry(sessionId: string, id: string, actor: string) {
  return transition(sessionId, id, "pending", "hidden", "hide", actor);
}

export function hideEntry(sessionId: string, id: string, actor: string) {
  return transition(sessionId, id, "visible", "hidden", "hide", actor);
}

export async function restoreEntry(
  sessionId: string,
  id: string,
  clearedAt: number | null,
  actor: string,
): Promise<EntryRow | null> {
  const [row] = await getDb()
    .select()
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.sessionId, sessionId), eq(entries.status, "hidden")))
    .limit(1);
  if (!row) return null;

  const keepsPlace = row.shownAt !== null && (clearedAt === null || row.shownAt.getTime() > clearedAt);
  const [updated] = await getDb()
    .update(entries)
    .set({ status: "visible", shownAt: keepsPlace ? row.shownAt : new Date() })
    .where(and(eq(entries.id, id), eq(entries.status, "hidden")))
    .returning();
  if (!updated) return null;
  await logAction(updated.id, "restore", actor);
  return updated;
}

export async function editEntry(
  sessionId: string,
  id: string,
  text: string,
  normalized: string,
  actor: string,
): Promise<EntryRow | null> {
  const [updated] = await getDb()
    .update(entries)
    .set({ text, normalized })
    .where(and(eq(entries.id, id), eq(entries.sessionId, sessionId)))
    .returning();
  if (!updated) return null;
  await logAction(updated.id, "edit", actor);
  return updated;
}
