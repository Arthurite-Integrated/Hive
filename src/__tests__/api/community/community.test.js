import { describe, it, expect, beforeEach } from "vitest";
import "../setup.js";
import {
	request,
	API,
	createAuthenticatedUser,
	authHeader,
} from "../helpers.js";
import { Community } from "#modules/community/community.model";
import { CommunityMember } from "#models/community-member.model";

describe("Communities API", () => {
	let instructor;
	let student;

	beforeEach(async () => {
		instructor = await createAuthenticatedUser("instructor", {
			firstName: "Teach",
			lastName: "Er",
		});
		student = await createAuthenticatedUser("student", {
			firstName: "Stu",
			lastName: "Dent",
		});
	});

	// ─── Create ───────────────────────────────────────────────────────────────

	describe("POST /communities", () => {
		it("should create a community as instructor and auto-join as owner", async () => {
			const res = await request
				.post(`${API}/communities`)
				.set(authHeader(instructor.accessToken))
				.send({
					name: "Test Community",
					description: "A test community",
					category: "Development",
					visibility: "public",
					requireApproval: false,
					paymentRequired: false,
				})
				.expect(201);

			expect(res.body.success).toBe(true);
			expect(res.body.data.name).toBe("Test Community");
			expect(res.body.data.slug).toBe("test-community");
			expect(res.body.data.memberCount).toBe(1);

			const member = await CommunityMember.findOne({
				communityId: res.body.data._id,
				userId: instructor.user._id,
				role: "owner",
				status: "active",
			});
			expect(member).not.toBeNull();
		});

		it("should auto-resolve slug collision with a suffix", async () => {
			await Community.create({
				name: "Collision Test",
				slug: "collision-test",
				ownerId: instructor.user._id,
			});

			const res = await request
				.post(`${API}/communities`)
				.set(authHeader(instructor.accessToken))
				.send({ name: "Collision Test", visibility: "public" })
				.expect(201);

			expect(res.body.data.slug).toMatch(/^collision-test-[a-f0-9]+$/);
		});

		it("should reject creation by a student (403)", async () => {
			await request
				.post(`${API}/communities`)
				.set(authHeader(student.accessToken))
				.send({ name: "Student Community", visibility: "public" })
				.expect(403);
		});

		it("should reject creation without auth (401)", async () => {
			await request
				.post(`${API}/communities`)
				.send({ name: "No Auth", visibility: "public" })
				.expect(401);
		});

		it("should reject missing required name field", async () => {
			await request
				.post(`${API}/communities`)
				.set(authHeader(instructor.accessToken))
				.send({ visibility: "public" })
				.expect(400);
		});
	});

	// ─── List ─────────────────────────────────────────────────────────────────

	describe("GET /communities", () => {
		beforeEach(async () => {
			await Community.insertMany([
				{
					name: "React Masters",
					slug: "react-masters",
					ownerId: instructor.user._id,
					category: "Development",
					visibility: "public",
					status: "active",
				},
				{
					name: "Design Hub",
					slug: "design-hub",
					ownerId: instructor.user._id,
					category: "Design",
					visibility: "public",
					status: "active",
				},
				{
					name: "Private Club",
					slug: "private-club",
					ownerId: instructor.user._id,
					visibility: "private",
					status: "active",
				},
				{
					name: "Archived Group",
					slug: "archived-group",
					ownerId: instructor.user._id,
					visibility: "public",
					status: "archived",
				},
			]);
		});

		it("should return only active public communities by default", async () => {
			const res = await request.get(`${API}/communities`).expect(200);
			expect(res.body.success).toBe(true);
			const names = res.body.data.map((c) => c.name);
			expect(names).toContain("React Masters");
			expect(names).toContain("Design Hub");
			expect(names).not.toContain("Private Club");
			expect(names).not.toContain("Archived Group");
		});

		it("should filter by category", async () => {
			const res = await request
				.get(`${API}/communities?category=Design`)
				.expect(200);
			expect(res.body.data).toHaveLength(1);
			expect(res.body.data[0].name).toBe("Design Hub");
		});

		it("should return pagination metadata", async () => {
			const res = await request
				.get(`${API}/communities?page=1&limit=1`)
				.expect(200);
			expect(res.body.page).toBe(1);
			expect(res.body.limit).toBe(1);
			expect(res.body.total).toBeGreaterThanOrEqual(1);
			expect(typeof res.body.hasMore).toBe("boolean");
		});
	});

	// ─── My Communities ───────────────────────────────────────────────────────

	describe("GET /communities/mine", () => {
		it("should return only communities owned by the instructor", async () => {
			const instructor2 = await createAuthenticatedUser("instructor", {
				email: `other-instructor-${Date.now()}@hive.test`,
			});
			await Community.insertMany([
				{
					name: "Mine",
					slug: `mine-${Date.now()}`,
					ownerId: instructor.user._id,
					status: "active",
				},
				{
					name: "Not Mine",
					slug: `not-mine-${Date.now()}`,
					ownerId: instructor2.user._id,
					status: "active",
				},
			]);

			const res = await request
				.get(`${API}/communities/mine`)
				.set(authHeader(instructor.accessToken))
				.expect(200);

			expect(
				res.body.data.every(
					(c) => c.ownerId.toString() === instructor.user._id.toString(),
				),
			).toBe(true);
		});

		it("should reject student accessing /mine (403)", async () => {
			await request
				.get(`${API}/communities/mine`)
				.set(authHeader(student.accessToken))
				.expect(403);
		});
	});

	// ─── Get by slug ──────────────────────────────────────────────────────────

	describe("GET /communities/:slug", () => {
		let community;

		beforeEach(async () => {
			community = await Community.create({
				name: "Slug Test Community",
				slug: "slug-test-community",
				ownerId: instructor.user._id,
				status: "active",
				visibility: "public",
			});
		});

		it("should return community by slug (unauthenticated)", async () => {
			const res = await request
				.get(`${API}/communities/slug-test-community`)
				.expect(200);
			expect(res.body.community.name).toBe("Slug Test Community");
			expect(res.body.membership).toBeNull();
		});

		it("should include membership when authenticated member requests", async () => {
			await CommunityMember.create({
				communityId: community._id,
				userId: student.user._id,
				userType: "student",
				role: "member",
				status: "active",
			});

			const res = await request
				.get(`${API}/communities/slug-test-community`)
				.set(authHeader(student.accessToken))
				.expect(200);

			expect(res.body.community.name).toBe("Slug Test Community");
			expect(res.body.membership).not.toBeNull();
			expect(res.body.membership.role).toBe("member");
		});

		it("should return 404 for non-existent slug", async () => {
			await request.get(`${API}/communities/does-not-exist`).expect(404);
		});

		it("should return 404 for archived community", async () => {
			await Community.create({
				name: "Archived",
				slug: "archived-comm",
				ownerId: instructor.user._id,
				status: "archived",
			});
			await request.get(`${API}/communities/archived-comm`).expect(404);
		});
	});

	// ─── Update ───────────────────────────────────────────────────────────────

	describe("PATCH /communities/:slug", () => {
		let community;

		beforeEach(async () => {
			const res = await request
				.post(`${API}/communities`)
				.set(authHeader(instructor.accessToken))
				.send({ name: "Update Me", visibility: "public" })
				.expect(201);
			community = res.body.data;
		});

		it("should allow owner to update description", async () => {
			const res = await request
				.patch(`${API}/communities/${community.slug}`)
				.set(authHeader(instructor.accessToken))
				.send({ description: "Updated description" })
				.expect(200);

			expect(res.body.data.description).toBe("Updated description");
		});

		it("should regenerate slug when name is updated", async () => {
			const res = await request
				.patch(`${API}/communities/${community.slug}`)
				.set(authHeader(instructor.accessToken))
				.send({ name: "Renamed Community" })
				.expect(200);

			expect(res.body.data.slug).toBe("renamed-community");
		});

		it("should reject update by non-member (403)", async () => {
			await request
				.patch(`${API}/communities/${community.slug}`)
				.set(authHeader(student.accessToken))
				.send({ description: "Hacked" })
				.expect(403);
		});

		it("should reject unauthenticated update (401)", async () => {
			await request
				.patch(`${API}/communities/${community.slug}`)
				.send({ description: "No auth" })
				.expect(401);
		});
	});

	// ─── Archive (delete) ─────────────────────────────────────────────────────

	describe("DELETE /communities/:slug", () => {
		let community;

		beforeEach(async () => {
			const res = await request
				.post(`${API}/communities`)
				.set(authHeader(instructor.accessToken))
				.send({ name: "Archive Me", visibility: "public" })
				.expect(201);
			community = res.body.data;
		});

		it("should archive community as owner", async () => {
			await request
				.delete(`${API}/communities/${community.slug}`)
				.set(authHeader(instructor.accessToken))
				.expect(200);

			const updated = await Community.findById(community._id);
			expect(updated.status).toBe("archived");
		});

		it("should reject archive by non-member (403)", async () => {
			await request
				.delete(`${API}/communities/${community.slug}`)
				.set(authHeader(student.accessToken))
				.expect(403);
		});

		it("should return 404 after archiving (slug no longer accessible)", async () => {
			await request
				.delete(`${API}/communities/${community.slug}`)
				.set(authHeader(instructor.accessToken))
				.expect(200);

			await request.get(`${API}/communities/${community.slug}`).expect(404);
		});
	});
});
