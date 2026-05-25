import { describe, it, expect } from "vitest";
import "../setup.js";
import { request, API, registerAndVerify } from "../helpers.js";
import { CacheService } from "#services/cache.service";

const cacheService = CacheService.getInstance();

describe("Password Reset API", () => {
	describe("POST /auth/forgot-password", () => {
		it("should return 204 for a registered email (no enumeration)", async () => {
			const email = `forgot-${Date.now()}@hive.test`;
			await registerAndVerify("instructor", { email });

			await request
				.post(`${API}/auth/forgot-password`)
				.send({ email })
				.expect(204);
		});

		it("should return 204 for an unknown email (no enumeration)", async () => {
			await request
				.post(`${API}/auth/forgot-password`)
				.send({ email: "nobody@hive.test" })
				.expect(204);
		});

		it("should reject missing email", async () => {
			const res = await request
				.post(`${API}/auth/forgot-password`)
				.send({})
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /auth/reset-password", () => {
		it("should reset password with valid OTP", async () => {
			const email = `reset-${Date.now()}@hive.test`;
			await registerAndVerify("instructor", { email });

			await request
				.post(`${API}/auth/forgot-password`)
				.send({ email })
				.expect(204);

			const cached = await cacheService.get(`reset-otp:${email}`);
			expect(cached).toBeDefined();
			const otp = cached.otp;

			await request
				.post(`${API}/auth/reset-password`)
				.send({ email, otp, newPassword: "NewSecure789!" })
				.expect(204);
		});

		it("should allow login with new password after reset", async () => {
			const email = `reset-login-${Date.now()}@hive.test`;
			await registerAndVerify("instructor", { email });

			await request
				.post(`${API}/auth/forgot-password`)
				.send({ email })
				.expect(204);

			const cached = await cacheService.get(`reset-otp:${email}`);
			const otp = cached.otp;

			await request
				.post(`${API}/auth/reset-password`)
				.send({ email, otp, newPassword: "BrandNew999!" })
				.expect(204);

			const loginRes = await request
				.post(`${API}/auth/login`)
				.send({
					email,
					password: "BrandNew999!",
					userType: "instructor",
					loginType: "password",
				})
				.expect(200);

			expect(loginRes.body.data.accessToken).toBeDefined();
		});

		it("should reject old password after reset", async () => {
			const email = `reset-old-${Date.now()}@hive.test`;
			const oldPassword = "TestPass123!";
			await registerAndVerify("instructor", { email, password: oldPassword });

			await request
				.post(`${API}/auth/forgot-password`)
				.send({ email })
				.expect(204);

			const cached = await cacheService.get(`reset-otp:${email}`);
			const otp = cached.otp;

			await request
				.post(`${API}/auth/reset-password`)
				.send({ email, otp, newPassword: "ChangedPass456!" })
				.expect(204);

			const loginRes = await request
				.post(`${API}/auth/login`)
				.send({
					email,
					password: oldPassword,
					userType: "instructor",
					loginType: "password",
				})
				.expect(400);

			expect(loginRes.body.success).toBe(false);
		});

		it("should reject invalid OTP", async () => {
			const email = `reset-bad-otp-${Date.now()}@hive.test`;
			await registerAndVerify("instructor", { email });

			await request
				.post(`${API}/auth/forgot-password`)
				.send({ email })
				.expect(204);

			const res = await request
				.post(`${API}/auth/reset-password`)
				.send({ email, otp: "000000", newPassword: "SomePass123!" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});

		it("should lock out after 5 failed attempts", async () => {
			const email = `reset-lockout-${Date.now()}@hive.test`;
			await registerAndVerify("instructor", { email });

			await request
				.post(`${API}/auth/forgot-password`)
				.send({ email })
				.expect(204);

			const cached = await cacheService.get(`reset-otp:${email}`);
			const correctOtp = cached.otp;

			// burn through 5 wrong attempts
			for (let i = 0; i < 5; i++) {
				await request
					.post(`${API}/auth/reset-password`)
					.send({ email, otp: "000000", newPassword: "SomePass123!" });
			}

			// 6th attempt should trigger lockout or be blocked
			const res = await request
				.post(`${API}/auth/reset-password`)
				.send({ email, otp: correctOtp, newPassword: "SomePass123!" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});

		it("should reject expired/missing OTP session", async () => {
			const res = await request
				.post(`${API}/auth/reset-password`)
				.send({
					email: "nobody@hive.test",
					otp: "123456",
					newPassword: "SomePass123!",
				})
				.expect(400);

			expect(res.body.success).toBe(false);
		});

		it("should reject missing required fields", async () => {
			const res = await request
				.post(`${API}/auth/reset-password`)
				.send({ email: "test@hive.test" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});
});
