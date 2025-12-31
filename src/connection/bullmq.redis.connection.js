import { config } from "#config/config";
import { logger } from "#utils/logger";
import Redis from "ioredis";

let bullmqRedisClient = null;

/**
 * Creates and returns a Redis client for BullMQ
 * BullMQ requires ioredis, not the standard redis package
 * @returns {Redis}
 */
export const getBullMQRedisClient = () => {
  if (!bullmqRedisClient) {
    logger.warn("Creating BullMQ Redis connection", config.redis.uri);
    bullmqRedisClient = new Redis(config.redis.uri, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    
    bullmqRedisClient.on("connect", () => {
      logger.info("BullMQ Redis client connected 🗑️");
    });

    bullmqRedisClient.on("error", (error) => {
      logger.error("BullMQ Redis client error", error);
    });
  }
  
  return bullmqRedisClient;
};

export const closeBullMQRedisConnection = async () => {
  if (bullmqRedisClient) {
    await bullmqRedisClient.quit();
    bullmqRedisClient = null;
    logger.info("BullMQ Redis connection closed");
  }
};

