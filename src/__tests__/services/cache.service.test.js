import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDel = vi.fn();
const mockScan = vi.fn();
const mockSet = vi.fn();
const mockGet = vi.fn();
const mockQuit = vi.fn();
const mockFlushall = vi.fn();
const mockOn = vi.fn();

vi.mock("ioredis", () => {
	return {
		default: vi.fn(function () {
			this.del = mockDel;
			this.scan = mockScan;
			this.set = mockSet;
			this.get = mockGet;
			this.quit = mockQuit;
			this.flushall = mockFlushall;
			this.on = mockOn;
		}),
	};
});

vi.mock("#config/config", () => ({
	config: { redis: { uri: "redis://localhost:6379" } },
}));

vi.mock("#constants/ttl.constant", () => ({
	TTL: { IN_30_MINUTES: 1800 },
}));

vi.mock("#utils/logger", () => ({
	logger: { info: vi.fn(), error: vi.fn() },
}));

const { CacheService } = await import("#services/cache.service");

beforeEach(() => {
	vi.clearAllMocks();
	CacheService.instance = null;
});

describe("CacheService.invalidateAllUserSessions", () => {
	it("should scan and delete all refresh and auth keys for a user", async () => {
		const cacheService = CacheService.getInstance();

		mockScan
			.mockResolvedValueOnce([
				"0",
				["refresh:user123-111", "refresh:user123-222"],
			])
			.mockResolvedValueOnce([
				"0",
				["auth:user123-111", "auth:user123-222"],
			]);

		await cacheService.invalidateAllUserSessions("user123");

		expect(mockScan).toHaveBeenCalledWith(
			"0",
			"MATCH",
			"refresh:user123-*",
			"COUNT",
			100,
		);
		expect(mockScan).toHaveBeenCalledWith(
			"0",
			"MATCH",
			"auth:user123-*",
			"COUNT",
			100,
		);
		expect(mockDel).toHaveBeenCalledWith(
			"refresh:user123-111",
			"refresh:user123-222",
		);
		expect(mockDel).toHaveBeenCalledWith(
			"auth:user123-111",
			"auth:user123-222",
		);
	});

	it("should not call del when no keys match", async () => {
		const cacheService = CacheService.getInstance();

		mockScan
			.mockResolvedValueOnce(["0", []])
			.mockResolvedValueOnce(["0", []]);

		await cacheService.invalidateAllUserSessions("user123");

		expect(mockDel).not.toHaveBeenCalled();
	});
});
