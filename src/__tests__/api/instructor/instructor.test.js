import { describe, it, expect, beforeEach } from "vitest";
import "../setup.js";
import {
	request,
	API,
	createAuthenticatedUser,
	authHeader,
} from "../helpers.js";

describe("Instructor API", () => {
	let instructor;

	beforeEach(async () => {
		instructor = await createAuthenticatedUser("instructor", {
			firstName: "John",
			lastName: "Doe",
		});
	});

	describe("GET /instructor/me", () => {
		it("should return the instructor profile", async () => {
			const res = await request
				.get(`${API}/instructor/me`)
				.set(authHeader(instructor.accessToken))
				.expect(200);

			expect(res.body.success).toBe(true);
			expect(res.body.data.firstName).toBe("John");
			expect(res.body.data.lastName).toBe("Doe");
			expect(res.body.data.salt).toBeUndefined();
			expect(res.body.data.hash).toBeUndefined();
		});

		it("should reject unauthenticated requests", async () => {
			await request.get(`${API}/instructor/me`).expect(401);
		});
	});

	describe("PATCH /instructor/me", () => {
		it("should update allowed fields", async () => {
			const res = await request
				.patch(`${API}/instructor/me`)
				.set(authHeader(instructor.accessToken))
				.send({
					firstName: "Jane",
					bio: "Updated bio",
					specializations: ["Math", "Science"],
				})
				.expect(200);

			expect(res.body.data.firstName).toBe("Jane");
			expect(res.body.data.bio).toBe("Updated bio");
			expect(res.body.data.specializations).toEqual(["Math", "Science"]);
		});

		it("should strip unknown fields", async () => {
			const res = await request
				.patch(`${API}/instructor/me`)
				.set(authHeader(instructor.accessToken))
				.send({ firstName: "Jane", hackerField: "nope" })
				.expect(200);

			expect(res.body.data.firstName).toBe("Jane");
			expect(res.body.data.hackerField).toBeUndefined();
		});
	});

	describe("PATCH /instructor/me/password", () => {
		it("should change password with correct current password", async () => {
			const res = await request
				.patch(`${API}/instructor/me/password`)
				.set(authHeader(instructor.accessToken))
				.send({
					currentPassword: "TestPass123!",
					newPassword: "NewPass456!",
				})
				.expect(200);

			expect(res.body.success).toBe(true);
		});

		it("should reject wrong current password", async () => {
			const res = await request
				.patch(`${API}/instructor/me/password`)
				.set(authHeader(instructor.accessToken))
				.send({
					currentPassword: "WrongPass!",
					newPassword: "NewPass456!",
				})
				.expect(400);

			expect(res.body.success).toBe(false);
		});
	});

	describe("POST /instructor/me/profile-photo", () => {
		it("should return 501 (not implemented)", async () => {
			const res = await request
				.post(`${API}/instructor/me/profile-photo`)
				.set(authHeader(instructor.accessToken))
				.expect(501);

			expect(res.body.success).toBe(false);
		});
	});

	describe("PATCH /instructor/me/onboard", () => {
		it("should onboard with instructor-specific fields", async () => {
			const res = await request
				.patch(`${API}/instructor/me/onboard`)
				.set(authHeader(instructor.accessToken))
				.send({
					bio: "10 years teaching experience",
					specializations: ["Mathematics"],
					gradeExperienceLevels: ["secondary"],
					yearsOfExperience: 10,
					teachingMode: ["online", "hybrid"],
					preferences: { emailNotifications: true },
				})
				.expect(200);

			expect(res.body.data.onboarded).toBe(true);
			expect(res.body.data.specializations).toEqual(["Mathematics"]);
			expect(res.body.data.teachingMode).toEqual(["online", "hybrid"]);
		});
	});

	describe("DELETE /instructor/me", () => {
		it("should soft-delete the account", async () => {
			const res = await request
				.delete(`${API}/instructor/me`)
				.set(authHeader(instructor.accessToken))
				.expect(200);

			expect(res.body.success).toBe(true);
		});
	});
});
