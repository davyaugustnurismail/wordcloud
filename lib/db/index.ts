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

  const env = getEnv();
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 15_000,
    keepAlive: true,
  });
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
