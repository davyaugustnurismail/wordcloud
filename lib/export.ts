import { asc, eq, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { blockedTerms, entries, sessions } from "./db/schema";
import { parseSettings } from "./settings";

type SessionRow = typeof sessions.$inferSelect;
type EntryRow = typeof entries.$inferSelect;

export type ExportFormat = "csv" | "json";

const BOM = "﻿";
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function safeText(value: string): string {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
}

function iso(date: Date | null): string {
  return date ? date.toISOString() : "";
}

function csv(header: string[], rows: string[][]): string {
  return BOM + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

async function loadSessionBundle(session: SessionRow) {
  const db = getDb();
  const [rows, terms] = await Promise.all([
    db.select().from(entries).where(eq(entries.sessionId, session.id)).orderBy(asc(entries.createdAt), asc(entries.id)),
    db
      .select({ term: blockedTerms.term })
      .from(blockedTerms)
      .where(eq(blockedTerms.sessionId, session.id))
      .orderBy(asc(blockedTerms.term)),
  ]);
  return { session, entries: rows, blocklist: terms.map((row) => row.term) };
}

function entryJson(row: EntryRow) {
  return {
    id: row.id,
    text: row.text,
    normalized: row.normalized,
    status: row.status,
    createdAt: iso(row.createdAt),
    shownAt: iso(row.shownAt),
    deviceId: row.deviceId,
  };
}

function sessionJson(bundle: Awaited<ReturnType<typeof loadSessionBundle>>) {
  const { session } = bundle;
  return {
    id: session.id,
    code: session.code,
    name: session.name,
    status: session.status,
    createdAt: iso(session.createdAt),
    endedAt: iso(session.endedAt),
    settings: parseSettings(session.settings),
    blocklist: bundle.blocklist,
    entries: bundle.entries.map(entryJson),
  };
}

export type ExportFile = { body: string; contentType: string; filename: string };

function datestamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

export async function buildSessionExport(session: SessionRow, format: ExportFormat): Promise<ExportFile> {
  const bundle = await loadSessionBundle(session);
  const base = `wordcloud-${session.code}-${datestamp()}`;

  if (format === "json") {
    const body = JSON.stringify({ exportedAt: new Date().toISOString(), session: sessionJson(bundle) }, null, 2);
    return { body, contentType: "application/json; charset=utf-8", filename: `${base}.json` };
  }

  const rows = bundle.entries.map((row) => [
    row.id,
    row.text,
    row.status,
    iso(row.createdAt),
    iso(row.shownAt),
    row.deviceId ?? "",
  ]);
  return {
    body: csv(["id", "kata", "status", "dikirim", "tampil", "device"], rows),
    contentType: "text/csv; charset=utf-8",
    filename: `${base}.csv`,
  };
}

export async function buildAllExport(format: ExportFormat): Promise<ExportFile> {
  const db = getDb();
  const allSessions = await db.select().from(sessions).orderBy(asc(sessions.createdAt), asc(sessions.id));
  const bundles = await Promise.all(allSessions.map(loadSessionBundle));
  const base = `wordcloud-semua-sesi-${datestamp()}`;

  if (format === "json") {
    const globalTerms = await db
      .select({ term: blockedTerms.term })
      .from(blockedTerms)
      .where(isNull(blockedTerms.sessionId))
      .orderBy(asc(blockedTerms.term));
    const body = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        globalBlocklist: globalTerms.map((row) => row.term),
        sessions: bundles.map(sessionJson),
      },
      null,
      2,
    );
    return { body, contentType: "application/json; charset=utf-8", filename: `${base}.json` };
  }

  const rows = bundles.flatMap((bundle) =>
    bundle.entries.map((row) => [
      bundle.session.code,
      safeText(bundle.session.name),
      row.id,
      row.text,
      row.status,
      iso(row.createdAt),
      iso(row.shownAt),
      row.deviceId ?? "",
    ]),
  );
  return {
    body: csv(["sesi_kode", "sesi_nama", "id", "kata", "status", "dikirim", "tampil", "device"], rows),
    contentType: "text/csv; charset=utf-8",
    filename: `${base}.csv`,
  };
}
