import "../load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getEnv } from "../env";
import { skeletonWord } from "../words";
import { getDb, getPool } from "./index";

const MAX_ATTEMPTS = 30;

async function waitForDatabase() {
  for (let attempt = 1; ; attempt++) {
    try {
      await getPool().query("select 1");
      return;
    } catch (err) {
      if (attempt >= MAX_ATTEMPTS) throw err;
      console.log(`[migrate] database belum siap (percobaan ${attempt}/${MAX_ATTEMPTS}), menunggu...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

const BACKFILL_CHUNK = 1000;

async function backfillSkeletons() {
  const pool = getPool();
  for (;;) {
    const { rows } = await pool.query<{ id: string; term: string }>(
      "select id, term from blocked_terms where skeleton = '' limit $1",
      [BACKFILL_CHUNK],
    );
    if (rows.length === 0) return;
    const updated = await pool.query(
      "update blocked_terms b set skeleton = v.skeleton from unnest($1::uuid[], $2::text[]) as v(id, skeleton) where b.id = v.id and v.skeleton <> ''",
      [rows.map((row) => row.id), rows.map((row) => skeletonWord(row.term))],
    );
    if (updated.rowCount === 0) return;
  }
}

async function main() {
  getEnv();
  await waitForDatabase();
  await migrate(getDb(), { migrationsFolder: "drizzle" });
  await backfillSkeletons();
  console.log("[migrate] migrasi selesai");
  await getPool().end();
}

main().catch((err) => {
  console.error("[migrate] gagal:", err);
  process.exit(1);
});
