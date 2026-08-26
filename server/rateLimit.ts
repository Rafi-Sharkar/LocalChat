import Redis from "ioredis";

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Sliding window / atomic counter rate limiter using Redis
 */
export async function checkRateLimit(
  redis: Redis,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const { key, limit, windowSeconds } = options;
  const now = Math.floor(Date.now() / 1000);
  const redisKey = `ratelimit:${key}`;

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.ttl(redisKey);

    const results = await pipeline.exec();
    if (!results) {
      return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
    }

    const count = (results[0][1] as number) || 1;
    const ttl = (results[1][1] as number) || -1;

    // Set expiration on first hit
    if (count === 1 || ttl === -1) {
      await redis.expire(redisKey, windowSeconds);
    }

    if (count > limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: 0,
    };
  } catch (err) {
    console.error("[RateLimit Error]", err);
    // Fail open in case of rate limit evaluation error to avoid breaking client
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}
