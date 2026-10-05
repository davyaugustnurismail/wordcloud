import { getRedis } from "./redis";

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

type Window = { count: number; expiresAt: number };

const fallbackWindows = new Map<string, Window>();
const FALLBACK_SWEEP_SIZE = 5000;
const REDIS_TIMEOUT_MS = 500;

function hitFallback(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  if (fallbackWindows.size > FALLBACK_SWEEP_SIZE) {
    for (const [existing, window] of fallbackWindows) {
      if (window.expiresAt <= now) fallbackWindows.delete(existing);
    }
  }
  const current = fallbackWindows.get(key);
  const window = current && current.expiresAt > now ? current : { count: 0, expiresAt: now + windowSec * 1000 };
  window.count++;
  fallbackWindows.set(key, window);
  if (window.count <= limit) return { allowed: true, retryAfterSec: 0 };
  return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((window.expiresAt - now) / 1000)) };
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("redis timeout")), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

export async function hitRateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis.status !== "ready") return hitFallback(key, limit, windowSec);

  const redisKey = `rl:${key}`;
  try {
    const results = await withTimeout(redis.multi().incr(redisKey).expire(redisKey, windowSec, "NX").exec(), REDIS_TIMEOUT_MS);
    const first = results?.[0];
    if (!first || first[0]) throw first?.[0] ?? new Error("rate limit tidak terbaca");
    const count = Number(first[1]);
    if (count <= limit) return { allowed: true, retryAfterSec: 0 };
    const ttl = await withTimeout(redis.ttl(redisKey), REDIS_TIMEOUT_MS);
    return { allowed: false, retryAfterSec: ttl > 0 ? ttl : windowSec };
  } catch {
    return hitFallback(key, limit, windowSec);
  }
}
