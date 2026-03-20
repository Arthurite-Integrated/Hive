import { describe, it, expect, vi, beforeEach } from "vitest";

const {
	mockSet,
	mockGet,
	mockDelete,
	mockInvalidateAllUserSessions,
	mockEmailAdd,
	mockFindOne,
	mockSetPassword,
	mockSave,
} = vi.hoisted(() => ({
	mockSet: vi.fn(),
	mockGet: vi.fn(),
	mockDelete: vi.fn(),
	mockInvalidateAllUserSessions: vi.fn(),
	mockEmailAdd: vi.fn(),
	mockFindOne: vi.fn(),
	mockSetPassword: vi.fn().mockResolvedValue({}),
	mockSave: vi.fn().mockResolvedValue({}),
}));

vi.mock("#services/cache.service", () => ({
	CacheService: {
		getInstance: () => ({
			set: mockSet,
			get: mockGet,
			delete: mockDelete,
			invalidateAllUserSessions: mockInvalidateAllUserSessions,
			redis: { exists: vi.fn() },
		}),
		getRedisClient: () => ({}),
	},
}));

vi.mock("#services/queues/email.queue.service", () => ({
	EmailQueueService: {
		getInstance: () => ({
			add: mockEmailAdd,
		}),
	},
}));

vi.mock("#services/jwt.service", () => ({
	JwtService: {
		getInstance: () => ({
			generateToken: vi.fn(() => "mock-access-token"),
			generateTokenFromPayload: vi.fn(() => "mock-refresh-token"),
			verifyToken: vi.fn(),
			validateToken: vi.fn(),
		}),
	},
}));

vi.mock("#services/encryption.service", () => ({
	EncryptionService: {
		getInstance: () => ({
			encrypt: vi.fn((v) => v),
			decrypt: vi.fn((v) => v),
		}),
	},
}));

vi.mock("#config/config", () => ({
	config: {
		server: { rootDomain: "https://app.usehive.com" },
		redis: { uri: "redis://localhost:6379" },
	},
}));

vi.mock("#constants/ttl.constant", () => ({
	TTL: { IN_10_MINUTES: 600, IN_30_MINUTES: 1800, IN_7_DAYS: 604800 },
}));

vi.mock("#utils/logger", () => ({
	logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("#modules/instructor/instructor.model", () => ({
	Instructor: { findOne: mockFindOne, create: vi.fn() },
}));
vi.mock("#modules/parent/parent.model", () => ({
	Parent: { findOne: vi.fn(), create: vi.fn() },
}));
vi.mock("#modules/student/student.model", () => ({
	Student: { findOne: vi.fn(), create: vi.fn() },
}));
vi.mock("#modules/instructor/instructor.service", () => ({
	InstructorService: { getInstance: () => ({}) },
}));
vi.mock("#modules/parent/parent.service", () => ({
	ParentService: { getInstance: () => ({}) },
}));
vi.mock("#modules/student/student.service", () => ({
	StudentService: { getInstance: () => ({}) },
}));
vi.mock("#modules/auth/services/oauth/google.oauth.service.js", () => ({
	GoogleOAuthService: { getInstance: () => ({}) },
}));
vi.mock("#modules/auth/services/oauth/facebook.oauth.service.js", () => ({
	FacebookOAuthService: { getInstance: () => ({}) },
}));

const { AuthService } = await import(
	"#modules/auth/services/auth.service"
);
const { generateResetToken, hashResetToken } = await import(
	"#helpers/auth/index"
);

beforeEach(() => {
	vi.clearAllMocks();
	AuthService.instance = null;
});

describe("AuthService.forgotPassword", () => {
	it("should generate token, store hash in Redis, and enqueue email for existing EMAIL user", async () => {
		const authService = AuthService.getInstance();

		const mockUser = {
			_id: "user123",
			email: "test@example.com",
			firstName: "Test",
			authMethod: "email",
		};
		mockFindOne.mockResolvedValueOnce(mockUser);

		await authService.forgotPassword({
			email: "test@example.com",
			userType: "instructor",
		});

		expect(mockSet).toHaveBeenCalledWith(
			"reset-token:instructor:test@example.com",
			expect.stringMatching(/^[a-f0-9]{64}$/),
			600,
		);

		expect(mockEmailAdd).toHaveBeenCalledWith(
			"reset-password",
			expect.objectContaining({
				message: {
					to: "test@example.com",
					subject: "Reset your Hive password",
				},
				template: "reset-password",
				locals: expect.objectContaining({
					name: "Test",
					expiryMinutes: "10",
				}),
			}),
		);
	});

	it("should not send email or store token if user not found", async () => {
		const authService = AuthService.getInstance();

		mockFindOne.mockResolvedValueOnce(null);

		await authService.forgotPassword({
			email: "nonexistent@example.com",
			userType: "instructor",
		});

		expect(mockSet).not.toHaveBeenCalled();
		expect(mockEmailAdd).not.toHaveBeenCalled();
	});

	it("should not send email for OAuth-only users", async () => {
		const authService = AuthService.getInstance();

		const mockUser = {
			_id: "user123",
			email: "test@example.com",
			firstName: "Test",
			authMethod: "google",
		};
		mockFindOne.mockResolvedValueOnce(mockUser);

		await authService.forgotPassword({
			email: "test@example.com",
			userType: "instructor",
		});

		expect(mockSet).not.toHaveBeenCalled();
		expect(mockEmailAdd).not.toHaveBeenCalled();
	});
});

describe("AuthService.resetPassword", () => {
	it("should reset password and invalidate sessions with valid token", async () => {
		const authService = AuthService.getInstance();

		const rawToken = generateResetToken();
		const tokenHash = hashResetToken(rawToken);

		mockGet.mockResolvedValueOnce(tokenHash);

		const mockUser = {
			_id: { toString: () => "user123" },
			email: "test@example.com",
			setPassword: mockSetPassword,
			save: mockSave,
		};
		mockFindOne.mockResolvedValueOnce(mockUser);

		await authService.resetPassword({
			email: "test@example.com",
			token: rawToken,
			newPassword: "NewSecureP@ss1",
			userType: "instructor",
		});

		expect(mockSetPassword).toHaveBeenCalledWith("NewSecureP@ss1");
		expect(mockSave).toHaveBeenCalled();
		expect(mockDelete).toHaveBeenCalledWith(
			"reset-token:instructor:test@example.com",
		);
		expect(mockInvalidateAllUserSessions).toHaveBeenCalledWith("user123");
	});

	it("should throw error when no token exists in Redis", async () => {
		const authService = AuthService.getInstance();

		mockGet.mockResolvedValueOnce(null);

		await expect(
			authService.resetPassword({
				email: "test@example.com",
				token: "invalid-token",
				newPassword: "NewSecureP@ss1",
				userType: "instructor",
			}),
		).rejects.toThrow();
	});

	it("should throw error when token hash does not match", async () => {
		const authService = AuthService.getInstance();

		mockGet.mockResolvedValueOnce(hashResetToken("correct-token"));

		await expect(
			authService.resetPassword({
				email: "test@example.com",
				token: "wrong-token",
				newPassword: "NewSecureP@ss1",
				userType: "instructor",
			}),
		).rejects.toThrow();
	});
});
