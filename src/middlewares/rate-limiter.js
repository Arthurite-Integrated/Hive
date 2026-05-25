import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { CacheService } from "#services/cache.service";

function createRedisStore(prefix) {
	return new RedisStore({
		sendCommand: (...args) => CacheService.getRedisClient().call(...args),
		prefix: `rl:${prefix}:`,
	});
}

export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	store: createRedisStore("auth"),
	message: {
		success: false,
		error: {
			code: "RATE_LIMITED",
			message: "Too many attempts. Please try again later.",
		},
	},
});

export const apiLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
	store: createRedisStore("api"),
	message: {
		success: false,
		error: {
			code: "RATE_LIMITED",
			message: "Too many requests. Please slow down.",
		},
	},
});

// Relaxed limiter for polling endpoints (thread, conversations, unread counts)
export const pollingLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 600,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
	store: createRedisStore("polling"),
	message: {
		success: false,
		error: {
			code: "RATE_LIMITED",
			message: "Too many requests. Please slow down.",
		},
	},
});

export const uploadLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	max: 20,
	standardHeaders: true,
	legacyHeaders: false,
	keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
	store: createRedisStore("upload"),
	message: {
		success: false,
		error: {
			code: "RATE_LIMITED",
			message: "Upload limit reached. Please try again later.",
		},
	},
});
