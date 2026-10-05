import "../load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getEnv } from "../env";
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

async function main() {
  getEnv();
  await waitForDatabase();
  await migrate(getDb(), { migrationsFolder: "drizzle" });
  console.log("[migrate] migrasi selesai");
  await getPool().end();
}

main().catch((err) => {
  console.error("[migrate] gagal:", err);
  process.exit(1);
});
