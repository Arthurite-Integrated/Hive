import {
	throwBadRequestError,
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { Community } from "#modules/community/community.model";
import { CommunityMember } from "#models/community-member.model";
import { getUserModel } from "#utils/user-model-router";
import { Instructor } from "#modules/instructor/instructor.model";
import { Student } from "#modules/student/student.model";

export class MembershipService {
	static instance = null;

	/** @returns {MembershipService} */
	static getInstance() {
		if (!MembershipService.instance) {
			MembershipService.instance = new MembershipService();
		}
		return MembershipService.instance;
	}

	/** @private */
	constructor() {}

	/**
	 * Join a community.
	 * @param {string} communityId — MongoDB ObjectId string
	 * @param {string} userId
	 * @param {string} userType  — 'instructor' | 'student'
	 * @param {string|undefined} inviteCode
	 */
	join = async (communityId, userId, userType, inviteCode) => {
		const community = await Community.findOne({
			_id: communityId,
			status: "active",
		}).lean();

		if (!community) {
			throwNotFoundError("Community not found.");
		}

		// Check for existing membership
		const existing = await CommunityMember.findOne({
			communityId: community._id,
			userId,
		}).lean();

		if (existing) {
			if (existing.status === "active") {
				throwBadRequestError("Already a member.");
			}
			if (existing.status === "pending") {
				throwBadRequestError("Join request already pending.");
			}
			if (existing.status === "blocked") {
				throwForbiddenError("You have been blocked from this community.");
			}
		}

		// Private community requires an invite code
		if (community.visibility === "private" && !inviteCode) {
			throwForbiddenError("This community is invite-only.");
		}

		// Payment-gated communities (Phase 4 handles the actual flow)
		if (community.paymentRequired) {
			throwBadRequestError("Payment required — use checkout flow.");
		}

		// Approval required: create pending membership
		if (community.requireApproval) {
			const membership = await CommunityMember.create({
				communityId: community._id,
				userId,
				userType,
				role: "member",
				status: "pending",
				joinedAt: new Date(),
			});
			return { membership, requiresApproval: true };
		}

		// Free, public, no approval: create active membership and increment count
		const membership = await CommunityMember.create({
			communityId: community._id,
			userId,
			userType,
			role: "member",
			status: "active",
			joinedAt: new Date(),
		});

		await Community.findByIdAndUpdate(community._id, {
			$inc: { memberCount: 1 },
		});

		return { membership, requiresApproval: false };
	};

	/**
	 * Leave a community.
	 * @param {string} communityId — MongoDB ObjectId string
	 * @param {string} userId
	 */
	leave = async (communityId, userId) => {
		const community = await Community.findOne({
			_id: communityId,
			status: "active",
		}).lean();

		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const membership = await CommunityMember.findOne({
			communityId: community._id,
			userId,
		}).lean();

		if (!membership) {
			throwNotFoundError("Not a member.");
		}

		if (membership.role === "owner") {
			throwBadRequestError("Owner cannot leave. Transfer ownership first.");
		}

		await CommunityMember.deleteOne({ _id: membership._id });

		// Only decrement if they were an active member
		if (membership.status === "active") {
			await Community.findByIdAndUpdate(community._id, {
				$inc: { memberCount: -1 },
			});
		}
	};

	/**
	 * Get paginated members list (owner/admin only).
	 * @param {string} communityId — MongoDB ObjectId string
	 * @param {string} requesterId
	 * @param {{ role?: string, status?: string, search?: string, page?: number, limit?: number }} opts
	 */
	getMembers = async (communityId, requesterId, opts = {}) => {
		const { role, status, search, page = 1, limit = 20 } = opts;

		const community = await Community.findOne({
			_id: communityId,
			status: "active",
		}).lean();

		if (!community) {
			throwNotFoundError("Community not found.");
		}

		// Verify requester is owner or admin
		const requesterMembership = await CommunityMember.findOne({
			communityId: community._id,
			userId: requesterId,
			status: "active",
			role: { $in: ["owner", "admin"] },
		}).lean();

		if (!requesterMembership) {
			throwForbiddenError(
				"You do not have permission to view this community's members.",
			);
		}

		const filter = {
			communityId: community._id,
			...(role && { role }),
			...(status && { status }),
		};

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
		const skip = (pageNum - 1) * limitNum;

		const [members, total] = await Promise.all([
			CommunityMember.find(filter)
				.sort({ joinedAt: -1 })
				.skip(skip)
				.limit(limitNum)
				.lean(),
			CommunityMember.countDocuments(filter),
		]);

		// Cross-collection populate by userType (Option B)
		const byType = {};
		for (const m of members) {
			if (!byType[m.userType]) byType[m.userType] = [];
			byType[m.userType].push(m);
		}

		const usersById = {};
		for (const [type, group] of Object.entries(byType)) {
			const Model = getUserModel(type);
			const ids = group.map((g) => g.userId);
			const users = await Model.find({ _id: { $in: ids } })
				.select("firstName lastName email profilePhoto")
				.lean();
			for (const u of users) {
				usersById[String(u._id)] = u;
			}
		}

		// Apply search filter post-populate (name/email match)
		let data = members.map((m) => ({
			...m,
			user: usersById[String(m.userId)] ?? null,
		}));

		if (search) {
			const lc = search.toLowerCase();
			data = data.filter((m) => {
				if (!m.user) return false;
				const fullName = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
				const email = (m.user.email ?? "").toLowerCase();
				return fullName.includes(lc) || email.includes(lc);
			});
		}

		return {
			data,
			page: pageNum,
			limit: limitNum,
			total,
			hasMore: skip + data.length < total,
		};
	};

	/**
	 * Update a member's role or status.
	 * @param {string} communityId — MongoDB ObjectId string
	 * @param {string} requesterId
	 * @param {string} targetUserId
	 * @param {{ role?: string, status?: string }} changes
	 */
	updateMember = async (communityId, requesterId, targetUserId, changes) => {
		const community = await Community.findOne({
			_id: communityId,
			status: "active",
		}).lean();

		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const requesterMembership = await CommunityMember.findOne({
			communityId: community._id,
			userId: requesterId,
			status: "active",
			role: { $in: ["owner", "admin"] },
		}).lean();

		if (!requesterMembership) {
			throwForbiddenError("You do not have permission to manage members.");
		}

		const targetMembership = await CommunityMember.findOne({
			communityId: community._id,
			userId: targetUserId,
		});

		if (!targetMembership) {
			throwNotFoundError("Member not found.");
		}

		// Owner cannot be demoted or blocked
		if (targetMembership.role === "owner") {
			throwForbiddenError("The community owner cannot be demoted or blocked.");
		}

		// Admins cannot modify other admins or owners (only owners can)
		if (
			requesterMembership.role === "admin" &&
			targetMembership.role === "admin"
		) {
			throwForbiddenError("Admins cannot modify other admins.");
		}

		if (changes.role !== undefined) {
			targetMembership.role = changes.role;
		}
		if (changes.status !== undefined) {
			targetMembership.status = changes.status;
		}

		await targetMembership.save();
		return targetMembership;
	};

	/**
	 * Approve a pending membership request.
	 * @param {string} communityId — MongoDB ObjectId string
	 * @param {string} requesterId
	 * @param {string} targetUserId
	 */
	approveMember = async (communityId, requesterId, targetUserId) => {
		const community = await Community.findOne({
			_id: communityId,
			status: "active",
		}).lean();

		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const requesterMembership = await CommunityMember.findOne({
			communityId: community._id,
			userId: requesterId,
			status: "active",
			role: { $in: ["owner", "admin"] },
		}).lean();

		if (!requesterMembership) {
			throwForbiddenError("You do not have permission to approve members.");
		}

		const targetMembership = await CommunityMember.findOne({
			communityId: community._id,
			userId: targetUserId,
			status: "pending",
		});

		if (!targetMembership) {
			throwNotFoundError("Pending membership not found.");
		}

		targetMembership.status = "active";
		targetMembership.joinedAt = new Date();
		await targetMembership.save();

		await Community.findByIdAndUpdate(community._id, {
			$inc: { memberCount: 1 },
		});

		return targetMembership;
	};

	/**
	 * Invite users by email to a community (creates pending memberships for found users).
	 * @param {string} communityId — MongoDB ObjectId string
	 * @param {string} requesterId
	 * @param {string[]} emails
	 */
	invite = async (communityId, requesterId, emails) => {
		const community = await Community.findOne({
			_id: communityId,
			status: "active",
		}).lean();

		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const requesterMembership = await CommunityMember.findOne({
			communityId: community._id,
			userId: requesterId,
			status: "active",
			role: { $in: ["owner", "admin"] },
		}).lean();

		if (!requesterMembership) {
			throwForbiddenError("You do not have permission to invite members.");
		}

		const sent = [];
		const failed = [];

		for (const email of emails) {
			// Search across Instructor and Student models
			const [instructor, student] = await Promise.all([
				Instructor.findOne({ email }).lean(),
				Student.findOne({ email }).lean(),
			]);

			const foundUser = instructor ?? student;

			if (!foundUser) {
				failed.push(email);
				continue;
			}

			const userType = instructor ? "instructor" : "student";

			// Check for existing active membership
			const existing = await CommunityMember.findOne({
				communityId: community._id,
				userId: foundUser._id,
			}).lean();

			if (existing && existing.status === "active") {
				failed.push(email);
				continue;
			}

			if (existing && existing.status === "pending") {
				// Already pending — count as sent (idempotent)
				sent.push(email);
				continue;
			}

			// Create pending membership (upsert for blocked/other edge cases)
			await CommunityMember.findOneAndUpdate(
				{ communityId: community._id, userId: foundUser._id },
				{
					$setOnInsert: {
						communityId: community._id,
						userId: foundUser._id,
						userType,
						role: "member",
						joinedAt: new Date(),
					},
					$set: { status: "pending" },
				},
				{ upsert: true, new: true },
			);

			sent.push(email);
		}

		return { sent, failed };
	};
}
