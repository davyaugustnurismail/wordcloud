import "../lib/load-env";
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { hash, argon2id } from "argon2";
import { eq, and, isNull } from "drizzle-orm";
import { getEnv } from "../lib/env";
import { getDb, getPool } from "../lib/db";
import { appSettings, assets, sessions } from "../lib/db/schema";

const SAMPLE_CODE = "KATA23";
const SAMPLE_PIN = "123456";
const LIBRARY_DIR = "library";
const SEED_ASSETS_DIR = path.join("scripts", "seed-assets");

const SESSION_DEFAULTS = {
  moderationMode: "live",
  photowallTheme: "black",
  inputTheme: "reggae",
  prompt: "Satu kata untuk malam ini?",
  maxChars: 20,
  cardBlur: true,
};

async function main() {
  const env = getEnv();
  const db = getDb();

  await db
    .insert(appSettings)
    .values({ key: "creator_password_hash", value: env.CREATOR_PASSWORD_HASH })
    .onConflictDoNothing();
  await db
    .insert(appSettings)
    .values({ key: "session_defaults", value: SESSION_DEFAULTS })
    .onConflictDoNothing();

  const existing = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.code, SAMPLE_CODE));
  if (existing.length === 0) {
    await db.insert(sessions).values({
      code: SAMPLE_CODE,
      name: "Sesi Photowall",
      pinHash: await hash(SAMPLE_PIN, { type: argon2id }),
      settings: SESSION_DEFAULTS,
    });
    console.log(`[seed] sesi contoh dibuat: kode ${SAMPLE_CODE}, PIN ${SAMPLE_PIN}`);
  } else {
    console.log(`[seed] sesi contoh ${SAMPLE_CODE} sudah ada, dilewati`);
  }

  const targetDir = path.join(env.UPLOAD_DIR, LIBRARY_DIR);
  await mkdir(targetDir, { recursive: true });
  const files = (await readdir(SEED_ASSETS_DIR)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  for (const file of files) {
    await copyFile(path.join(SEED_ASSETS_DIR, file), path.join(targetDir, file));
    const relPath = path.posix.join(LIBRARY_DIR, file);
    for (const kind of ["photowall_bg", "input_bg"] as const) {
      const found = await db
        .select({ id: assets.id })
        .from(assets)
        .where(and(isNull(assets.sessionId), eq(assets.kind, kind), eq(assets.path, relPath)));
      if (found.length === 0) {
        await db.insert(assets).values({ kind, path: relPath });
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
