import { describe, it, expect, beforeEach } from "vitest";
import {
	generate as totpGenerate,
	NobleCryptoPlugin,
	ScureBase32Plugin,
} from "otplib";
import "../setup.js";
import {
	request,
	API,
	createAuthenticatedUser,
	authHeader,
} from "../helpers.js";
import { Instructor } from "#modules/instructor/instructor.model";

const plugins = {
	crypto: new NobleCryptoPlugin(),
	base32: new ScureBase32Plugin(),
};

async function enableMfa(accessToken) {
	const enableRes = await request
		.post(`${API}/auth/mfa/enable`)
		.set(authHeader(accessToken))
		.expect(200);

	const { secret } = enableRes.body.data;

	const code = await totpGenerate({ secret, ...plugins });

	const setupRes = await request
		.post(`${API}/auth/mfa/verify-setup`)
		.set(authHeader(accessToken))
		.send({ code })
		.expect(200);

	return { secret, recoveryCodes: setupRes.body.data.recoveryCodes };
}

describe("MFA API", () => {
	let instructor;

	beforeEach(async () => {
		instructor = await createAuthenticatedUser("instructor", {
			email: `mfa-test-${Date.now()}@hive.test`,
		});
	});

	describe("POST /auth/mfa/enable", () => {
		it("should return a secret and QR code URL", async () => {
			const res = await request
				.post(`${API}/auth/mfa/enable`)
				.set(authHeader(instructor.accessToken))
				.expect(200);

			expect(res.body.success).toBe(true);
			expect(res.body.data.secret).toBeDefined();
			expect(res.body.data.qrCodeUrl).toBeDefined();
		});

		it("should reject unauthenticated requests", async () => {
			await request.post(`${API}/auth/mfa/enable`).expect(401);
		});

		it("should reject if MFA already enabled", async () => {
			await enableMfa(instructor.accessToken, instructor.user._id);

			const res = await request
				.post(`${API}/auth/mfa/enable`)
				.set(authHeader(instructor.accessToken))
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /auth/mfa/verify-setup", () => {
		it("should enable MFA and return recovery codes with valid TOTP code", async () => {
			const enableRes = await request
				.post(`${API}/auth/mfa/enable`)
				.set(authHeader(instructor.accessToken))
				.expect(200);

			const { secret } = enableRes.body.data;
			const code = await totpGenerate({ secret, ...plugins });

			const res = await request
				.post(`${API}/auth/mfa/verify-setup`)
				.set(authHeader(instructor.accessToken))
				.send({ code })
				.expect(200);

			expect(res.body.data.recoveryCodes).toHaveLength(10);

			const user = await Instructor.findById(instructor.user._id);
			expect(user.mfaEnabled).toBe(true);
		});

		it("should reject an invalid TOTP code during setup", async () => {
			await request
				.post(`${API}/auth/mfa/enable`)
				.set(authHeader(instructor.accessToken))
				.expect(200);

			const res = await request
				.post(`${API}/auth/mfa/verify-setup`)
				.set(authHeader(instructor.accessToken))
				.send({ code: "000000" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});

		it("should reject if no MFA setup session exists", async () => {
			const res = await request
				.post(`${API}/auth/mfa/verify-setup`)
				.set(authHeader(instructor.accessToken))
				.send({ code: "123456" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /auth/mfa/login", () => {
		it("should complete login with valid TOTP code", async () => {
			const { secret } = await enableMfa(instructor.accessToken);

			const mfaToken = await getMfaToken(instructor.user.email);
			const code = await totpGenerate({ secret, ...plugins });

			const res = await request
				.post(`${API}/auth/mfa/login`)
				.send({ mfaToken, code })
				.expect(200);

			expect(res.body.data.accessToken).toBeDefined();
			expect(res.body.data.user).toBeDefined();
		});

		it("should complete login with a valid recovery code", async () => {
			const { recoveryCodes } = await enableMfa(
				instructor.accessToken,
				instructor.user._id,
			);

			const mfaToken = await getMfaToken(instructor.user.email);

			const res = await request
				.post(`${API}/auth/mfa/login`)
				.send({ mfaToken, recoveryCode: recoveryCodes[0] })
				.expect(200);

			expect(res.body.data.accessToken).toBeDefined();
		});

		it("should reject an invalid TOTP code", async () => {
			const { _secret } = await enableMfa(instructor.accessToken);

			const mfaToken = await getMfaToken(instructor.user.email);

			const res = await request
				.post(`${API}/auth/mfa/login`)
				.send({ mfaToken, code: "000000" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});

		it("should reject an invalid recovery code", async () => {
			await enableMfa(instructor.accessToken, instructor.user._id);
			const mfaToken = await getMfaToken(instructor.user.email);

			const res = await request
				.post(`${API}/auth/mfa/login`)
				.send({ mfaToken, recoveryCode: "BADCODE" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});

		it("should reject if neither code nor recoveryCode is provided", async () => {
			await enableMfa(instructor.accessToken, instructor.user._id);
			const mfaToken = await getMfaToken(instructor.user.email);

			const res = await request
				.post(`${API}/auth/mfa/login`)
				.send({ mfaToken })
				.expect(400);

			expect(res.body.success).toBe(false);
		});

		it("should consume a recovery code (one-time use)", async () => {
			const { recoveryCodes } = await enableMfa(
				instructor.accessToken,
				instructor.user._id,
			);

			const mfaToken1 = await getMfaToken(instructor.user.email);
			await request
				.post(`${API}/auth/mfa/login`)
				.send({ mfaToken: mfaToken1, recoveryCode: recoveryCodes[0] })
				.expect(200);

			const mfaToken2 = await getMfaToken(instructor.user.email);
			const res = await request
				.post(`${API}/auth/mfa/login`)
				.send({ mfaToken: mfaToken2, recoveryCode: recoveryCodes[0] })
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /auth/mfa/disable", () => {
		it("should disable MFA with valid TOTP code", async () => {
			const { secret } = await enableMfa(instructor.accessToken);

			const code = await totpGenerate({ secret, ...plugins });

			await request
				.post(`${API}/auth/mfa/disable`)
				.set(authHeader(instructor.accessToken))
				.send({ code })
				.expect(204);

			const user = await Instructor.findById(instructor.user._id);
			expect(user.mfaEnabled).toBe(false);
		});

		it("should reject disabling MFA if not enabled", async () => {
			const res = await request
				.post(`${API}/auth/mfa/disable`)
				.set(authHeader(instructor.accessToken))
				.send({ code: "123456" })
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});
});

async function getMfaToken(email) {
	const user = await Instructor.findOne({ email });
	const { JwtService } = await import("#services/jwt.service");
	const jwtService = JwtService.getInstance();
	return jwtService.generateTokenFromPayload(
		{ userId: user._id, userType: "instructor", scope: "mfa-pending" },
		300,
	);
}
