import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient } from "#connection/redis.connection";
import logger from "#utils/logger";

// ---------------------------------------------------------------------------
// Helper — build a RedisStore that delegates to the shared node-redis client.
// rate-limit-redis v4 expects a `sendCommand` function that proxies raw
// Redis commands, keeping rate-limit counters in the same Redis instance
// already used by CacheService.  This means limits survive PM2 restarts and
// are shared across every cluster worker.
// ---------------------------------------------------------------------------
const buildStore = (prefix) =>
	new RedisStore({
		// node-redis v4+ exposes sendCommand for raw command dispatch
		sendCommand: (...args) => redisClient.sendCommand(args),
		prefix: `rl:${prefix}:`,
	});

// ---------------------------------------------------------------------------
// Shared handler — returns 429 with a Retry-After header and a JSON body that
// matches the rest of the API's error shape.
// ---------------------------------------------------------------------------
const tooManyRequestsHandler = (req, res, _next, options) => {
	// options.resetTime is a Date set by express-rate-limit
	const retryAfterSeconds = options.resetTime
		? Math.ceil((options.resetTime.getTime() - Date.now()) / 1000)
		: Math.ceil(options.windowMs / 1000);

	res.setHeader("Retry-After", retryAfterSeconds);

	logger.warn("Rate limit exceeded", {
		ip: req.ip,
		path: req.path,
		method: req.method,
		userId: req.user?.id ?? null,
	});

	res.status(429).json({
		success: false,
		statusCode: 429,
		message: options.message,
		retryAfter: retryAfterSeconds,
	});
};

// ---------------------------------------------------------------------------
// Tier 1 — Auth routes  (login, register, forgot-password, verify-otp, OAuth)
// 10 requests per 15 minutes, keyed by IP address.
// Tight window to slow credential-stuffing and brute-force attacks.
// ---------------------------------------------------------------------------
export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 10,
	keyGenerator: (req) => req.ip,
	store: buildStore("auth"),
	standardHeaders: "draft-7", // sets RateLimit-* headers (RFC draft-7)
	legacyHeaders: false,
	message: "Too many authentication attempts. Please try again later.",
	handler: tooManyRequestsHandler,
	skipFailedRequests: false,
	skipSuccessfulRequests: false,
});

// ---------------------------------------------------------------------------
// Tier 2 — General API routes
// 100 requests per minute, keyed by authenticated user ID (falls back to IP
// when the request is not yet authenticated, e.g. before the JWT middleware).
// ---------------------------------------------------------------------------
export const apiRateLimiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	limit: 100,
	keyGenerator: (req) =>
		// req.user is attached by JwtService auth middleware
		req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`,
	store: buildStore("api"),
	standardHeaders: "draft-7",
	legacyHeaders: false,
	message: "Too many requests. Please slow down.",
	handler: tooManyRequestsHandler,
});

// ---------------------------------------------------------------------------
// Tier 3 — Webhooks  (Paystack, Flutterwave, etc.)
// Exempt — payment gateways sign their payloads; enforcing an IP-based limit
// would cause legitimate webhook deliveries to be rejected during retries.
// Export a pass-through middleware so the router can stay consistent.
// ---------------------------------------------------------------------------
export const webhookRateLimiter = (_req, _res, next) => next();

// ---------------------------------------------------------------------------
// Tier 4 — File upload routes
// 20 requests per hour, keyed by authenticated user ID (falls back to IP).
// Prevents storage abuse without blocking normal usage patterns.
// ---------------------------------------------------------------------------
export const uploadRateLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	limit: 20,
	keyGenerator: (req) =>
		req.user?.id ? `user:${req.user.id}` : `ip:${req.ip}`,
	store: buildStore("upload"),
	standardHeaders: "draft-7",
	legacyHeaders: false,
	message: "Upload limit reached. You can upload again in up to one hour.",
	handler: tooManyRequestsHandler,
});