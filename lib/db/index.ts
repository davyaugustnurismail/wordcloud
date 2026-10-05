import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { getEnv } from "../env";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

const KEY = Symbol.for("wordcloud.db");
type Holder = typeof globalThis & { [KEY]?: { pool: pg.Pool; db: Db } };

function connect() {
  const holder = globalThis as Holder;
  const existing = holder[KEY];
  if (existing) return existing;

  const pool = new pg.Pool({ connectionString: getEnv().DATABASE_URL, max: 10 });
  pool.on("error", (err) => console.error(`[db] ${err.message}`));

  const created = { pool, db: drizzle(pool, { schema }) };
  holder[KEY] = created;
  return created;
}

export function getDb(): Db {
  return connect().db;
}

export function getPool(): pg.Pool {
  return connect().pool;
}
