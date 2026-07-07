import supertest from "supertest";
import { app } from "../../../app/app.js";
import { Instructor } from "#modules/instructor/instructor.model";
import { Student } from "#modules/student/student.model";
import { Parent } from "#modules/parent/parent.model";
import {
	generateAuthId,
	generateAuthenticatedData,
	generateAuthTokens,
} from "#helpers/auth/index";
import { CacheService } from "#services/cache.service";
import { EncryptionService } from "#services/encryption.service";
import { JwtService } from "#services/jwt.service";

export const request = supertest(app);
export const API = "/api/v1";

const models = { instructor: Instructor, student: Student, parent: Parent };
const cacheService = CacheService.getInstance();
const encryptionService = EncryptionService.getInstance();
const jwtService = JwtService.getInstance();

/**
 * Creates a verified, authenticated user and returns tokens.
 * Bypasses the register+OTP flow for speed.
 */
export const createAuthenticatedUser = async (
	userType = "instructor",
	overrides = {},
) => {
	const Model = models[userType];
	const defaults = {
		firstName: "Test",
		lastName: "User",
		email: `test-${userType}-${Date.now()}@hive.test`,
		emailVerified: true,
		emailVerifiedAt: new Date(),
		userType,
		...overrides,
	};

	const user = await Model.create(defaults);
	await user.setPassword(overrides.password || "TestPass123!");
	await user.save();

	const authId = generateAuthId(user._id);
	const authData = generateAuthenticatedData(user.toObject());
	await cacheService.set(authId, authData);

	const { accessToken, refreshToken } = await generateAuthTokens(authId);

	return { user, accessToken, refreshToken };
};

/**
 * Registers via the API and extracts the OTP from Redis to verify.
 * Returns the full verified response with tokens.
 */
export const registerAndVerify = async (userType, data = {}) => {
	const payload = {
		firstName: data.firstName || "Test",
		lastName: data.lastName || "User",
		email: data.email || `test-${userType}-${Date.now()}@hive.test`,
		password: data.password || "TestPass123!",
		userType,
	};

	const registerRes = await request
		.post(`${API}/auth/register`)
		.send(payload)
		.expect(201);

	const regToken = registerRes.body.data.token;

	// Decode JWT to get authId, then pull OTP from Redis
	const { authId } = jwtService.verifyToken(regToken);
	const cached = await cacheService.get(authId);
	const otpData = await cacheService.get(cached.otpId);
	const otp = encryptionService.decrypt(otpData.otp);

	const verifyRes = await request
		.post(`${API}/auth/verify`)
		.set("Authorization", `Bearer ${regToken}`)
		.send({ otp })
		.expect(200);

	return {
		...verifyRes.body.data,
		email: payload.email,
		password: payload.password,
	};
};

export const authHeader = (token) => ({
	Authorization: `Bearer ${token}`,
});
