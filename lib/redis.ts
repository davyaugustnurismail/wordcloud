import { Redis } from "ioredis";
import { getEnv } from "./env";

const KEY = Symbol.for("wordcloud.redis");
type Holder = typeof globalThis & { [KEY]?: Redis };

export function getRedis(): Redis {
  const holder = globalThis as Holder;
  const existing = holder[KEY];
  if (existing) return existing;

  const client = new Redis(getEnv().REDIS_URL, { maxRetriesPerRequest: 3 });
  let lastLogged = 0;
  client.on("error", (err) => {
    const now = Date.now();
    if (now - lastLogged > 5000) {
      lastLogged = now;
      console.error(`[redis] ${err.message}`);
    }
  });
  holder[KEY] = client;
  return client;
}
