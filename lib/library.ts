import { and, asc, isNull } from "drizzle-orm";
import path from "node:path";
import { getDb } from "./db";
import { assets, sessions } from "./db/schema";
import { parseSettings } from "./settings";

export type LibraryImage = {
  path: string;
  name: string;
  photowallId: string | null;
  inputId: string | null;
  previewId: string;
  usedBy: number;
};

const SUFFIX = /-[0-9a-f]{8}$/;

export function libraryDisplayName(relativePath: string): string {
  const extension = path.posix.extname(relativePath);
  const base = path.posix.basename(relativePath, extension).replace(SUFFIX, "");
  return `${base}${extension}`;
}

export async function listLibraryImages(): Promise<LibraryImage[]> {
  const db = getDb();
  const [rows, sessionRows] = await Promise.all([
    db
      .select()
      .from(assets)
      .where(and(isNull(assets.sessionId)))
      .orderBy(asc(assets.createdAt), asc(assets.id)),
    db.select({ settings: sessions.settings }).from(sessions),
  ]);

  const used = new Map<string, number>();
  for (const row of sessionRows) {
    const settings = parseSettings(row.settings);
    for (const id of new Set([settings.photowallBgId, settings.inputBgId])) {
      if (id) used.set(id, (used.get(id) ?? 0) + 1);
    }
  }

  const byPath = new Map<string, LibraryImage>();
  for (const row of rows) {
    if (row.kind === "mask") continue;
    const image =
      byPath.get(row.path) ??
      ({
        path: row.path,
        name: libraryDisplayName(row.path),
        photowallId: null,
        inputId: null,
        previewId: row.id,
        usedBy: 0,
      } satisfies LibraryImage);
    if (row.kind === "photowall_bg") image.photowallId = row.id;
    if (row.kind === "input_bg") image.inputId = row.id;
    image.usedBy += used.get(row.id) ?? 0;
    byPath.set(row.path, image);
  }
  return [...byPath.values()];
}
