import { config } from "#config/config";
import { CacheService } from "#services/cache.service";
import { logger } from "#utils/logger";

const cacheService = CacheService.getInstance();

export const redisConnection = async () => {
	try {
		logger.warn("Connecting to Redis", config.redis.uri);
		await cacheService.connectToRedis();
		logger.info("Connected to Redis 🗑️");
	} catch (error) {
		logger.error("Error connecting to Redis", error);
	}
};
