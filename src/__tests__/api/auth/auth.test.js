import { describe, it, expect } from "vitest";
import "../setup.js";
import { request, API, registerAndVerify } from "../helpers.js";

describe("Auth API", () => {
	const userPayload = {
		firstName: "Auth",
		lastName: "Tester",
		email: `auth-test-${Date.now()}@hive.test`,
		password: "TestPass123!",
	};

	describe("POST /auth/register", () => {
		it("should register an instructor and return a token", async () => {
			const res = await request
				.post(`${API}/auth/register`)
				.send({ ...userPayload, userType: "instructor" })
				.expect(201);

			expect(res.body.success).toBe(true);
			expect(res.body.data.token).toBeDefined();
		});

		it("should reject duplicate email", async () => {
			const email = `dup-${Date.now()}@hive.test`;
			await registerAndVerify("instructor", { ...userPayload, email });

			const res = await request
				.post(`${API}/auth/register`)
				.send({ ...userPayload, email, userType: "instructor" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});

		it("should reject invalid userType", async () => {
			const res = await request
				.post(`${API}/auth/register`)
				.send({ ...userPayload, userType: "admin" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});

		it("should reject missing required fields", async () => {
			const res = await request
				.post(`${API}/auth/register`)
				.send({ email: "x@y.com" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /auth/verify", () => {
		it("should verify email with correct OTP and return tokens", async () => {
			const data = await registerAndVerify("instructor", {
				email: `verify-${Date.now()}@hive.test`,
			});

			expect(data.accessToken).toBeDefined();
			expect(data.refreshToken).toBeDefined();
			expect(data.user).toBeDefined();
			expect(data.user.emailVerified).toBe(true);
		});
	});

	describe("POST /auth/login", () => {
		it("should login with correct password", async () => {
			const email = `login-${Date.now()}@hive.test`;
			await registerAndVerify("instructor", {
				...userPayload,
				email,
			});

			const res = await request
				.post(`${API}/auth/login`)
				.send({
					email,
					password: userPayload.password,
					userType: "instructor",
					loginType: "password",
				})
				.expect(200);

			expect(res.body.success).toBe(true);
			expect(res.body.data.accessToken).toBeDefined();
			expect(res.body.data.refreshToken).toBeDefined();
		});

		it("should reject wrong password", async () => {
			const email = `login-bad-${Date.now()}@hive.test`;
			await registerAndVerify("instructor", {
				...userPayload,
				email,
			});

			const res = await request
				.post(`${API}/auth/login`)
				.send({
					email,
					password: "WrongPass999!",
					userType: "instructor",
					loginType: "password",
				})
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /auth/refresh", () => {
		it("should return new tokens with valid refresh token", async () => {
			const { refreshToken } = await registerAndVerify("instructor", {
				email: `refresh-${Date.now()}@hive.test`,
			});

			const res = await request
				.post(`${API}/auth/refresh`)
				.send({ refreshToken })
				.expect(200);

			expect(res.body.data.accessToken).toBeDefined();
			expect(res.body.data.refreshToken).toBeDefined();
		});
	});

	describe("POST /auth/logout", () => {
		it("should logout successfully", async () => {
			const { refreshToken } = await registerAndVerify("instructor", {
				email: `logout-${Date.now()}@hive.test`,
			});

			const res = await request
				.post(`${API}/auth/logout`)
				.send({ refreshToken })
				.expect(200);

			expect(res.body.success).toBe(true);
		});
	});

	describe("POST /auth/logout-all", () => {
		it("should logout all sessions", async () => {
			const { refreshToken } = await registerAndVerify("instructor", {
				email: `logout-all-${Date.now()}@hive.test`,
			});

			const res = await request
				.post(`${API}/auth/logout-all`)
				.send({ refreshToken })
				.expect(200);

			expect(res.body.success).toBe(true);
		});
	});

	describe("POST /auth/refresh (token rotation)", () => {
		it("should reject the old refresh token after rotation", async () => {
			const { refreshToken } = await registerAndVerify("instructor", {
				email: `refresh-rotation-${Date.now()}@hive.test`,
			});

			const rotateRes = await request
				.post(`${API}/auth/refresh`)
				.send({ refreshToken })
				.expect(200);

			const newRefreshToken = rotateRes.body.data.refreshToken;
			expect(newRefreshToken).toBeDefined();
			expect(newRefreshToken).not.toBe(refreshToken);

			const res = await request
				.post(`${API}/auth/refresh`)
				.send({ refreshToken })
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /auth/resend-otp", () => {
		it("should resend OTP for a pending email verification", async () => {
			const email = `resend-${Date.now()}@hive.test`;
			const registerRes = await request
				.post(`${API}/auth/register`)
				.send({
					firstName: "Re",
					lastName: "Send",
					email,
					password: "TestPass123!",
					userType: "instructor",
				})
				.expect(201);

			const regToken = registerRes.body.data.token;

			const res = await request
				.post(`${API}/auth/resend-otp`)
				.set("Authorization", `Bearer ${regToken}`)
				.expect(200);

			expect(res.body.success).toBe(true);
			expect(res.body.data.retryAfter).toBeDefined();
		});

		it("should reject resend within 60s cooldown", async () => {
			const email = `resend-throttle-${Date.now()}@hive.test`;
			const registerRes = await request
				.post(`${API}/auth/register`)
				.send({
					firstName: "Re",
					lastName: "Throttle",
					email,
					password: "TestPass123!",
					userType: "instructor",
				})
				.expect(201);

			const regToken = registerRes.body.data.token;

			await request
				.post(`${API}/auth/resend-otp`)
				.set("Authorization", `Bearer ${regToken}`)
				.expect(200);

			const res = await request
				.post(`${API}/auth/resend-otp`)
				.set("Authorization", `Bearer ${regToken}`)
				.expect(200);

			expect(res.body.data.retryAfter).toBeGreaterThan(0);
		});
	});
});
