import { config } from "#config/config";
import { CacheService } from "#services/cache.service";
import { logger } from "#utils/logger";

export const redisConnection = async () => {
	try {
		logger.warn("Connecting to Redis", config.redis.uri);
		CacheService.getInstance();
	} catch (error) {
		logger.error("Error connecting to Redis", error);
	}
};
