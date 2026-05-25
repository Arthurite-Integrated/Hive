import { describe, it, expect, beforeEach } from "vitest";
import "../setup.js";
import {
	request,
	API,
	createAuthenticatedUser,
	authHeader,
} from "../helpers.js";
import { ParentStudentLink } from "#models/join-tables/parent-student-link.model";

describe("Student API", () => {
	let student;

	beforeEach(async () => {
		student = await createAuthenticatedUser("student", {
			firstName: "Alice",
			lastName: "Smith",
		});
	});

	describe("GET /student/me", () => {
		it("should return the student profile", async () => {
			const res = await request
				.get(`${API}/student/me`)
				.set(authHeader(student.accessToken))
				.expect(200);

			expect(res.body.success).toBe(true);
			expect(res.body.data.firstName).toBe("Alice");
			expect(res.body.data.salt).toBeUndefined();
			expect(res.body.data.hash).toBeUndefined();
		});

		it("should reject unauthenticated requests", async () => {
			await request.get(`${API}/student/me`).expect(401);
		});
	});

	describe("PATCH /student/me", () => {
		it("should update allowed fields", async () => {
			const res = await request
				.patch(`${API}/student/me`)
				.set(authHeader(student.accessToken))
				.send({
					firstName: "Bob",
					bio: "Learning every day",
					preferences: { emailNotifications: false },
				})
				.expect(200);

			expect(res.body.data.firstName).toBe("Bob");
			expect(res.body.data.bio).toBe("Learning every day");
		});
	});

	describe("PATCH /student/me/password", () => {
		it("should change password", async () => {
			const res = await request
				.patch(`${API}/student/me/password`)
				.set(authHeader(student.accessToken))
				.send({
					currentPassword: "TestPass123!",
					newPassword: "NewPass456!",
				})
				.expect(200);

			expect(res.body.success).toBe(true);
		});
	});

	describe("POST /student/me/profile-photo", () => {
		it("should return 501 (not implemented)", async () => {
			await request
				.post(`${API}/student/me/profile-photo`)
				.set(authHeader(student.accessToken))
				.expect(501);
		});
	});

	describe("PATCH /student/me/onboard", () => {
		it("should onboard with student-specific fields", async () => {
			const res = await request
				.patch(`${API}/student/me/onboard`)
				.set(authHeader(student.accessToken))
				.send({
					bio: "Aspiring engineer",
					interests: ["math", "physics", "robotics"],
					preferences: { emailNotifications: true },
				})
				.expect(200);

			expect(res.body.data.onboarded).toBe(true);
			expect(res.body.data.interests).toEqual(["math", "physics", "robotics"]);
		});
	});

	describe("Parent-Student Linking (student side)", () => {
		let parent;

		beforeEach(async () => {
			parent = await createAuthenticatedUser("parent", {
				firstName: "ParentOf",
				lastName: "Alice",
			});
		});

		it("POST /student/me/approve-link/:linkId — should approve a pending link", async () => {
			const link = await ParentStudentLink.create({
				parentId: parent.user._id,
				studentId: student.user._id,
				status: "pending",
			});

			const res = await request
				.post(`${API}/student/me/approve-link/${link._id}`)
				.set(authHeader(student.accessToken))
				.expect(200);

			expect(res.body.data.status).toBe("active");
			expect(res.body.data.approvedByStudent).toBe(true);
		});

		it("GET /student/me/linked-parents — should return active linked parents", async () => {
			await ParentStudentLink.create({
				parentId: parent.user._id,
				studentId: student.user._id,
				status: "active",
				approvedByStudent: true,
			});

			const res = await request
				.get(`${API}/student/me/linked-parents`)
				.set(authHeader(student.accessToken))
				.expect(200);

			expect(res.body.data).toHaveLength(1);
			expect(res.body.data[0].parentId.firstName).toBe("ParentOf");
		});

		it("DELETE /student/me/links/:linkId — should revoke an active link", async () => {
			const link = await ParentStudentLink.create({
				parentId: parent.user._id,
				studentId: student.user._id,
				status: "active",
				approvedByStudent: true,
			});

			const res = await request
				.delete(`${API}/student/me/links/${link._id}`)
				.set(authHeader(student.accessToken))
				.expect(200);

			expect(res.body.success).toBe(true);
		});

		it("should reject approving a link that belongs to another student", async () => {
			const otherStudent = await createAuthenticatedUser("student", {
				firstName: "Other",
				email: `other-student-${Date.now()}@hive.test`,
			});

			const link = await ParentStudentLink.create({
				parentId: parent.user._id,
				studentId: otherStudent.user._id,
				status: "pending",
			});

			await request
				.post(`${API}/student/me/approve-link/${link._id}`)
				.set(authHeader(student.accessToken))
				.expect(403);
		});
	});

	describe("DELETE /student/me", () => {
		it("should soft-delete the account", async () => {
			const res = await request
				.delete(`${API}/student/me`)
				.set(authHeader(student.accessToken))
				.expect(200);

			expect(res.body.success).toBe(true);
		});
	});
});
