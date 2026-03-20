import { describe, it, expect } from "vitest";
import { forgotPasswordSchema, resetPasswordSchema } from "#validator/auth/index";

describe("forgotPasswordSchema", () => {
	it("should pass with valid email and userType", () => {
		const result = forgotPasswordSchema.safeParse({
			email: "test@example.com",
			userType: "instructor",
		});
		expect(result.success).toBe(true);
	});

	it("should fail without email", () => {
		const result = forgotPasswordSchema.safeParse({
			userType: "instructor",
		});
		expect(result.success).toBe(false);
	});

	it("should fail with invalid userType", () => {
		const result = forgotPasswordSchema.safeParse({
			email: "test@example.com",
			userType: "admin",
		});
		expect(result.success).toBe(false);
	});

	it("should accept all valid userTypes", () => {
		for (const userType of ["instructor", "parent", "student"]) {
			const result = forgotPasswordSchema.safeParse({
				email: "test@example.com",
				userType,
			});
			expect(result.success).toBe(true);
		}
	});
});

describe("resetPasswordSchema", () => {
	const validData = {
		email: "test@example.com",
		token: "abc123def456",
		newPassword: "SecureP@ss1",
		userType: "instructor",
	};

	it("should pass with valid data", () => {
		const result = resetPasswordSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it("should fail without token", () => {
		const { token, ...rest } = validData;
		const result = resetPasswordSchema.safeParse(rest);
		expect(result.success).toBe(false);
	});

	it("should fail with weak password (no uppercase)", () => {
		const result = resetPasswordSchema.safeParse({
			...validData,
			newPassword: "securep@ss1",
		});
		expect(result.success).toBe(false);
	});

	it("should fail with weak password (no special char)", () => {
		const result = resetPasswordSchema.safeParse({
			...validData,
			newPassword: "SecurePass1",
		});
		expect(result.success).toBe(false);
	});

	it("should fail with short password", () => {
		const result = resetPasswordSchema.safeParse({
			...validData,
			newPassword: "Sp@1",
		});
		expect(result.success).toBe(false);
	});

	it("should fail with invalid userType", () => {
		const result = resetPasswordSchema.safeParse({
			...validData,
			userType: "super_admin",
		});
		expect(result.success).toBe(false);
	});
});
