import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => logger.error({ err }, "Redis (main) connection error"));

export const bullRedis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

bullRedis.on("error", (err) => logger.error({ err }, "Redis (BullMQ) connection error"));

export async function connectRedis(): Promise<void> {
  try {
    if (redis.status === "wait") {
      await redis.connect();
    }

    if (bullRedis.status === "wait") {
      await bullRedis.connect();
    }

    logger.info("Redis clients connected");
  } catch (err) {
    logger.error({ err }, "Failed to connect Redis clients");
    throw err;
  }
}

export async function disconnectRedis(): Promise<void> {
  await Promise.all([redis.quit().catch(() => undefined), bullRedis.quit().catch(() => undefined)]);
}
