import Redis, { RedisOptions } from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient: Redis | null = null;
let isRedisConnected = false;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const options: RedisOptions = {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Exponential backoff with max 3s delay
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      enableReadyCheck: true,
      lazyConnect: false,
    };

    redisClient = new Redis(REDIS_URL, options);

    redisClient.on("connect", () => {
      console.log("[Redis] Connected successfully to:", REDIS_URL.replace(/:[^:@]+@/, ":***@"));
      isRedisConnected = true;
    });

    redisClient.on("ready", () => {
      isRedisConnected = true;
    });

    redisClient.on("error", (err) => {
      console.error("[Redis Error]", err.message);
      isRedisConnected = false;
    });

    redisClient.on("close", () => {
      isRedisConnected = false;
    });
  }

  return redisClient;
}

export function isRedisAvailable(): boolean {
  return isRedisConnected;
}

/**
 * Creates a duplicate redis client (useful for mock or isolated testing)
 */
export function createCustomRedis(url?: string): Redis {
  return new Redis(url || REDIS_URL);
}
