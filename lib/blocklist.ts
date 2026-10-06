import { and, asc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "./db";
import { blockedTerms } from "./db/schema";

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

export async function listSessionTerms(sessionId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ term: blockedTerms.term })
    .from(blockedTerms)
    .where(eq(blockedTerms.sessionId, sessionId))
    .orderBy(asc(blockedTerms.createdAt), asc(blockedTerms.term));
  return rows.map((row) => row.term);
}

export async function listGlobalTerms(): Promise<string[]> {
  const rows = await getDb()
    .select({ term: blockedTerms.term })
    .from(blockedTerms)
    .where(isNull(blockedTerms.sessionId))
    .orderBy(asc(blockedTerms.term));
  return rows.map((row) => row.term);
}

export async function addSessionTerm(sessionId: string, term: string): Promise<boolean> {
  const rows = await getDb()
    .insert(blockedTerms)
    .values({ term, sessionId })
    .onConflictDoNothing()
    .returning({ id: blockedTerms.id });
  return rows.length > 0;
}

export async function removeSessionTerm(sessionId: string, term: string): Promise<boolean> {
  const rows = await getDb()
    .delete(blockedTerms)
    .where(and(eq(blockedTerms.sessionId, sessionId), eq(blockedTerms.term, term)))
    .returning({ id: blockedTerms.id });
  return rows.length > 0;
}

function scopeFilter(sessionId: string | null) {
  return sessionId === null ? isNull(blockedTerms.sessionId) : eq(blockedTerms.sessionId, sessionId);
}

export async function listTerms(sessionId: string | null): Promise<string[]> {
  const rows = await getDb()
    .select({ term: blockedTerms.term })
    .from(blockedTerms)
    .where(scopeFilter(sessionId))
    .orderBy(asc(blockedTerms.createdAt), asc(blockedTerms.term));
  return rows.map((row) => row.term);
}

export async function addTerm(sessionId: string | null, term: string): Promise<boolean> {
  const rows = await getDb()
    .insert(blockedTerms)
    .values({ term, sessionId })
    .onConflictDoNothing()
    .returning({ id: blockedTerms.id });
  return rows.length > 0;
}

export async function removeTerm(sessionId: string | null, term: string): Promise<boolean> {
  const rows = await getDb()
    .delete(blockedTerms)
    .where(and(scopeFilter(sessionId), eq(blockedTerms.term, term)))
    .returning({ id: blockedTerms.id });
  return rows.length > 0;
}

const INSERT_CHUNK = 500;

export async function addTerms(sessionId: string | null, terms: string[]): Promise<number> {
  let added = 0;
  for (let start = 0; start < terms.length; start += INSERT_CHUNK) {
    const rows = await getDb()
      .insert(blockedTerms)
      .values(terms.slice(start, start + INSERT_CHUNK).map((term) => ({ term, sessionId })))
      .onConflictDoNothing()
      .returning({ id: blockedTerms.id });
    added += rows.length;
  }
  return added;
}
