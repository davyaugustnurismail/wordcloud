import "../lib/load-env";
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { argon2id, hash } from "argon2";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, getPool } from "../lib/db";
import { appSettings, assets, sessions } from "../lib/db/schema";
import { getEnv } from "../lib/env";
import { defaultSettings } from "../lib/settings";

const SAMPLE_CODE = "KATA23";
const SAMPLE_PIN = "123456";
const LIBRARY_DIR = "library";
const SEED_ASSETS_DIR = path.join("scripts", "seed-assets");

async function main() {
  const env = getEnv();
  const db = getDb();
  const settings = defaultSettings();

  await db
    .insert(appSettings)
    .values({ key: "creator_password_hash", value: env.CREATOR_PASSWORD_HASH })
    .onConflictDoNothing();
  await db.insert(appSettings).values({ key: "session_defaults", value: settings }).onConflictDoNothing();

  const existing = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.code, SAMPLE_CODE));
  if (existing.length === 0) {
    await db.insert(sessions).values({
      code: SAMPLE_CODE,
      name: "Sesi Photowall",
      pinHash: await hash(SAMPLE_PIN, { type: argon2id }),
      settings,
    });
    console.log(`[seed] sesi contoh dibuat: kode ${SAMPLE_CODE}, PIN ${SAMPLE_PIN}`);
  } else {
    await db.update(sessions).set({ settings }).where(eq(sessions.code, SAMPLE_CODE));
    console.log(`[seed] sesi contoh ${SAMPLE_CODE} sudah ada, settings diset ulang ke default`);
  }

  const targetDir = path.join(env.UPLOAD_DIR, LIBRARY_DIR);
  await mkdir(targetDir, { recursive: true });
  const files = (await readdir(SEED_ASSETS_DIR)).filter((file) => /\.(jpe?g|png|webp)$/i.test(file));
  for (const file of files) {
    await copyFile(path.join(SEED_ASSETS_DIR, file), path.join(targetDir, file));
    const relativePath = path.posix.join(LIBRARY_DIR, file);
    for (const kind of ["photowall_bg", "input_bg"] as const) {
      const found = await db
        .select({ id: assets.id })
        .from(assets)
        .where(and(isNull(assets.sessionId), eq(assets.kind, kind), eq(assets.path, relativePath)));
      if (found.length === 0) {
        await db.insert(assets).values({ kind, path: relativePath });
      }
    }
  }
  console.log(`[seed] pustaka gambar: ${files.length} file di ${targetDir}`);

  await getPool().end();
}

main().catch((err) => {
  console.error("[seed] gagal:", err);
  process.exit(1);
});
