import { describe, it, expect, beforeEach } from "vitest";
import "../setup.js";
import {
	request,
	API,
	createAuthenticatedUser,
	authHeader,
} from "../helpers.js";
import { ParentStudentLink } from "#models/join-tables/parent-student-link.model";

describe("Parent API", () => {
	let parent;

	beforeEach(async () => {
		parent = await createAuthenticatedUser("parent", {
			firstName: "Jane",
			lastName: "Doe",
		});
	});

	describe("GET /parent/me", () => {
		it("should return the parent profile", async () => {
			const res = await request
				.get(`${API}/parent/me`)
				.set(authHeader(parent.accessToken))
				.expect(200);

			expect(res.body.success).toBe(true);
			expect(res.body.data.firstName).toBe("Jane");
			expect(res.body.data.salt).toBeUndefined();
			expect(res.body.data.hash).toBeUndefined();
		});

		it("should reject unauthenticated requests", async () => {
			await request.get(`${API}/parent/me`).expect(401);
		});
	});

	describe("PATCH /parent/me", () => {
		it("should update allowed fields", async () => {
			const res = await request
				.patch(`${API}/parent/me`)
				.set(authHeader(parent.accessToken))
				.send({
					firstName: "Janet",
					bio: "Caring parent",
					preferences: {
						emailNotifications: false,
						progressReport: "monthly",
					},
				})
				.expect(200);

			expect(res.body.data.firstName).toBe("Janet");
			expect(res.body.data.bio).toBe("Caring parent");
		});
	});

	describe("PATCH /parent/me/password", () => {
		it("should change password", async () => {
			const res = await request
				.patch(`${API}/parent/me/password`)
				.set(authHeader(parent.accessToken))
				.send({
					currentPassword: "TestPass123!",
					newPassword: "NewPass456!",
				})
				.expect(200);

			expect(res.body.success).toBe(true);
		});
	});

	describe("POST /parent/me/profile-photo", () => {
		it("should return 501 (not implemented)", async () => {
			await request
				.post(`${API}/parent/me/profile-photo`)
				.set(authHeader(parent.accessToken))
				.expect(501);
		});
	});

	describe("PATCH /parent/me/onboard", () => {
		it("should onboard with parent-specific fields", async () => {
			const res = await request
				.patch(`${API}/parent/me/onboard`)
				.set(authHeader(parent.accessToken))
				.send({
					bio: "Monitoring my kids education",
					preferences: {
						emailNotifications: true,
						progressReport: "weekly",
					},
				})
				.expect(200);

			expect(res.body.data.onboarded).toBe(true);
		});
	});

	describe("Parent-Student Linking (parent side)", () => {
		let student;

		beforeEach(async () => {
			student = await createAuthenticatedUser("student", {
				firstName: "ChildOf",
				lastName: "Jane",
			});
		});

		it("POST /parent/me/link-student — should send a link request", async () => {
			const res = await request
				.post(`${API}/parent/me/link-student`)
				.set(authHeader(parent.accessToken))
				.send({
					studentEmail: student.user.email,
					relationship: "parent",
				})
				.expect(201);

			expect(res.body.data.status).toBe("pending");
			expect(res.body.data.parentId.toString()).toBe(
				parent.user._id.toString(),
			);
		});

		it("should reject linking to a non-existent student email", async () => {
			await request
				.post(`${API}/parent/me/link-student`)
				.set(authHeader(parent.accessToken))
				.send({
					studentEmail: "nobody@hive.test",
					relationship: "parent",
				})
				.expect(404);
		});

		it("should reject duplicate active link", async () => {
			await ParentStudentLink.create({
				parentId: parent.user._id,
				studentId: student.user._id,
				status: "active",
				approvedByStudent: true,
			});

			await request
				.post(`${API}/parent/me/link-student`)
				.set(authHeader(parent.accessToken))
				.send({
					studentEmail: student.user.email,
					relationship: "parent",
				})
				.expect(400);
		});

		it("should re-request a revoked link", async () => {
			await ParentStudentLink.create({
				parentId: parent.user._id,
				studentId: student.user._id,
				status: "revoked",
			});

			const res = await request
				.post(`${API}/parent/me/link-student`)
				.set(authHeader(parent.accessToken))
				.send({
					studentEmail: student.user.email,
					relationship: "guardian",
				})
				.expect(201);

			expect(res.body.data.status).toBe("pending");
			expect(res.body.data.relationship).toBe("guardian");
		});

		it("GET /parent/me/linked-students — should return active linked students", async () => {
			await ParentStudentLink.create({
				parentId: parent.user._id,
				studentId: student.user._id,
				status: "active",
				approvedByStudent: true,
			});

			const res = await request
				.get(`${API}/parent/me/linked-students`)
				.set(authHeader(parent.accessToken))
				.expect(200);

			expect(res.body.data).toHaveLength(1);
			expect(res.body.data[0].studentId.firstName).toBe("ChildOf");
		});

		it("DELETE /parent/me/links/:linkId — should revoke an active link", async () => {
			const link = await ParentStudentLink.create({
				parentId: parent.user._id,
				studentId: student.user._id,
				status: "active",
				approvedByStudent: true,
			});

			const res = await request
				.delete(`${API}/parent/me/links/${link._id}`)
				.set(authHeader(parent.accessToken))
				.expect(200);

			expect(res.body.success).toBe(true);
		});

		it("should reject revoking a link that belongs to another parent", async () => {
			const otherParent = await createAuthenticatedUser("parent", {
				firstName: "Other",
				email: `other-parent-${Date.now()}@hive.test`,
			});

			const link = await ParentStudentLink.create({
				parentId: otherParent.user._id,
				studentId: student.user._id,
				status: "active",
			});

			await request
				.delete(`${API}/parent/me/links/${link._id}`)
				.set(authHeader(parent.accessToken))
				.expect(403);
		});
	});

	describe("DELETE /parent/me", () => {
		it("should soft-delete the account", async () => {
			const res = await request
				.delete(`${API}/parent/me`)
				.set(authHeader(parent.accessToken))
				.expect(200);

			expect(res.body.success).toBe(true);
		});
	});
});
