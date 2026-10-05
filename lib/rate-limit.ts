import { getRedis } from "./redis";

export type RateLimitResult = { allowed: boolean; retryAfterSec: number };

export async function hitRateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const redis = getRedis();
  const redisKey = `rl:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSec);
  }
  if (count <= limit) {
    return { allowed: true, retryAfterSec: 0 };
  }
  const ttl = await redis.ttl(redisKey);
  return { allowed: false, retryAfterSec: ttl > 0 ? ttl : windowSec };
}
