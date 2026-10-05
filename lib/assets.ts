import { and, asc, eq, isNull, or } from "drizzle-orm";
import { getDb } from "./db";
import { assets } from "./db/schema";

export type AssetKind = typeof assets.$inferSelect.kind;

export type AssetRecord = {
  id: string;
  kind: AssetKind;
  sessionId: string | null;
  path: string;
};

function toRecord(row: typeof assets.$inferSelect): AssetRecord {
  return { id: row.id, kind: row.kind, sessionId: row.sessionId, path: row.path };
}

export async function findAsset(id: string): Promise<AssetRecord | null> {
  const [row] = await getDb().select().from(assets).where(eq(assets.id, id)).limit(1);
  return row ? toRecord(row) : null;
}

export async function listLibraryAssetIds(kind: AssetKind): Promise<string[]> {
  const rows = await getDb()
    .select({ id: assets.id })
    .from(assets)
    .where(and(isNull(assets.sessionId), eq(assets.kind, kind)))
    .orderBy(asc(assets.createdAt), asc(assets.id));
  return rows.map((row) => row.id);
}

export async function listSessionAssetIds(sessionId: string, kind: AssetKind): Promise<string[]> {
  const rows = await getDb()
    .select({ id: assets.id })
    .from(assets)
    .where(and(eq(assets.sessionId, sessionId), eq(assets.kind, kind)))
    .orderBy(asc(assets.createdAt), asc(assets.id));
  return rows.map((row) => row.id);
}

export async function isAssetUsable(id: string, sessionId: string | null, kind: AssetKind): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.id, id),
        eq(assets.kind, kind),
        sessionId === null ? isNull(assets.sessionId) : or(isNull(assets.sessionId), eq(assets.sessionId, sessionId)),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function createAsset(input: { sessionId: string | null; kind: AssetKind; path: string }): Promise<AssetRecord> {
  const [row] = await getDb().insert(assets).values(input).returning();
  if (!row) throw new Error("Aset gagal disimpan");
  return toRecord(row);
}
