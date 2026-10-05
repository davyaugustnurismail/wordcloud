import { Redis } from "ioredis";
import { getEnv } from "./env";

const KEY = Symbol.for("wordcloud.redis");
type Holder = typeof globalThis & { [KEY]?: Redis };

const LOG_INTERVAL_MS = 5000;

function logErrors(client: Redis, label: string) {
  let lastLogged = 0;
  client.on("error", (err) => {
    const now = Date.now();
    if (now - lastLogged > LOG_INTERVAL_MS) {
      lastLogged = now;
      console.error(`[${label}] ${err.message}`);
    }
  });
}

export function getRedis(): Redis {
  const holder = globalThis as Holder;
  const existing = holder[KEY];
  if (existing) return existing;

  const client = new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: 3 });
  logErrors(client, "redis");
  holder[KEY] = client;
  return client;
}

export function createAdapterClients(): { pub: Redis; sub: Redis } {
  const base = getRedis();
  const pub = base.duplicate();
  const sub = base.duplicate();
  logErrors(pub, "redis:pub");
  logErrors(sub, "redis:sub");

  const publish = pub.publish.bind(pub) as (channel: string | Buffer, message: string | Buffer) => Promise<number>;
  pub.publish = ((channel: string | Buffer, message: string | Buffer) =>
    publish(channel, message).catch(() => 0)) as unknown as typeof pub.publish;

  return { pub, sub };
}
