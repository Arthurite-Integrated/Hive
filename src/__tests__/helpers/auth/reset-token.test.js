import { describe, it, expect, vi } from "vitest";

vi.mock("#services/jwt.service", () => ({
	JwtService: {
		getInstance: () => ({
			generateToken: vi.fn(),
			generateTokenFromPayload: vi.fn(),
		}),
	},
}));

vi.mock("#services/cache.service", () => ({
	CacheService: {
		getInstance: () => ({
			set: vi.fn(),
			get: vi.fn(),
			redis: {},
		}),
	},
}));

vi.mock("#config/config", () => ({
	config: {
		redis: { uri: "redis://localhost:6379" },
	},
}));

vi.mock("#constants/ttl.constant", () => ({
	TTL: { IN_7_DAYS: 604800 },
}));

vi.mock("#utils/logger", () => ({
	logger: { info: vi.fn(), error: vi.fn() },
}));

const { generateResetToken, hashResetToken } = await import(
	"#helpers/auth/index"
);

describe("generateResetToken", () => {
	it("should return a 64-character hex string", () => {
		const token = generateResetToken();
		expect(token).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should generate unique tokens on each call", () => {
		const token1 = generateResetToken();
		const token2 = generateResetToken();
		expect(token1).not.toBe(token2);
	});
});

describe("hashResetToken", () => {
	it("should return a 64-character hex string (SHA-256)", () => {
		const hash = hashResetToken("abc123");
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should produce the same hash for the same input", () => {
		const hash1 = hashResetToken("test-token");
		const hash2 = hashResetToken("test-token");
		expect(hash1).toBe(hash2);
	});

	it("should produce different hashes for different inputs", () => {
		const hash1 = hashResetToken("token-a");
		const hash2 = hashResetToken("token-b");
		expect(hash1).not.toBe(hash2);
	});
});
