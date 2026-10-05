import { desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { entries, sessions } from "./db/schema";
import { parseSettings } from "./settings";

export type CountBucket = { start: number; count: number };
export type TopWord = { word: string; count: number };

export type SessionStats = {
  total: number;
  unique: number;
  pending: number;
  firstAt: number | null;
  buckets: CountBucket[];
  top: TopWord[];
};

export type GlobalStats = {
  activeSessions: number;
  totalSessions: number;
  totalEntries: number;
  uniqueWords: number;
  hours: CountBucket[];
  top: TopWord[];
};

export type SessionOverview = {
  id: string;
  code: string;
  name: string;
  status: "active" | "ended";
  moderationMode: "langsung" | "approve";
  entryCount: number;
  createdAt: number;
};

const FIVE_MINUTES_SEC = 300;
const TOP_LIMIT = 8;
const GLOBAL_TOP_LIMIT = 6;

export async function loadSessionStats(sessionId: string): Promise<SessionStats> {
  const db = getDb();

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      unique: sql<number>`count(distinct ${entries.normalized})::int`,
      pending: sql<number>`count(*) filter (where ${entries.status} = 'pending')::int`,
      firstAt: sql<Date | null>`min(${entries.createdAt})`,
    })
    .from(entries)
    .where(eq(entries.sessionId, sessionId));

  const bucketExpr = sql<Date>`to_timestamp(floor(extract(epoch from ${entries.createdAt}) / ${FIVE_MINUTES_SEC}) * ${FIVE_MINUTES_SEC})`;
  const buckets = await db
    .select({ start: bucketExpr, count: sql<number>`count(*)::int` })
    .from(entries)
    .where(eq(entries.sessionId, sessionId))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const top = await db
    .select({ word: entries.normalized, count: sql<number>`count(*)::int` })
    .from(entries)
    .where(eq(entries.sessionId, sessionId))
    .groupBy(entries.normalized)
    .orderBy(desc(sql`count(*)`), entries.normalized)
    .limit(TOP_LIMIT);

  return {
    total: totals?.total ?? 0,
    unique: totals?.unique ?? 0,
    pending: totals?.pending ?? 0,
    firstAt: totals?.firstAt ? new Date(totals.firstAt).getTime() : null,
    buckets: buckets.map((bucket) => ({ start: new Date(bucket.start).getTime(), count: bucket.count })),
    top,
  };
}

export async function loadGlobalStats(): Promise<GlobalStats> {
  const db = getDb();

  const [sessionCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${sessions.status} = 'active')::int`,
    })
    .from(sessions);

  const [entryCounts] = await db
    .select({
      total: sql<number>`count(*)::int`,
      unique: sql<number>`count(distinct ${entries.normalized})::int`,
    })
    .from(entries);

  const hourExpr = sql<Date>`date_trunc('hour', ${entries.createdAt})`;
  const hours = await db
    .select({ start: hourExpr, count: sql<number>`count(*)::int` })
    .from(entries)
    .where(gte(entries.createdAt, sql`now() - interval '24 hours'`))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const top = await db
    .select({ word: entries.normalized, count: sql<number>`count(*)::int` })
    .from(entries)
    .groupBy(entries.normalized)
    .orderBy(desc(sql`count(*)`), entries.normalized)
    .limit(GLOBAL_TOP_LIMIT);

  return {
    activeSessions: sessionCounts?.active ?? 0,
    totalSessions: sessionCounts?.total ?? 0,
    totalEntries: entryCounts?.total ?? 0,
    uniqueWords: entryCounts?.unique ?? 0,
    hours: hours.map((hour) => ({ start: new Date(hour.start).getTime(), count: hour.count })),
    top,
  };
}

export async function listSessionOverviews(): Promise<SessionOverview[]> {
  const db = getDb();
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: sessions.id,
        code: sessions.code,
        name: sessions.name,
        status: sessions.status,
        settings: sessions.settings,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .orderBy(desc(sessions.createdAt)),
    db
      .select({ sessionId: entries.sessionId, count: sql<number>`count(*)::int` })
      .from(entries)
      .groupBy(entries.sessionId),
  ]);
  const countBySession = new Map(counts.map((row) => [row.sessionId, row.count]));

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    moderationMode: parseSettings(row.settings).moderationMode,
    entryCount: countBySession.get(row.id) ?? 0,
    createdAt: row.createdAt.getTime(),
  }));
}
