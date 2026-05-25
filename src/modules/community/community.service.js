import {
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { Community } from "#modules/community/community.model";
import { CommunityMember } from "#models/community-member.model";
import { config } from "#config/config";

function resolveCoverImage(community) {
	if (!community || !community.coverImage) return community;
	const key = community.coverImage;
	if (key.startsWith("http")) return community;
	community.coverImage = config.aws.cloudfront.domain
		? `https://${config.aws.cloudfront.domain}/${key}`
		: `https://${config.aws.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
	return community;
}

export class CommunityService {
	static instance = null;

	/** @returns {CommunityService} */
	static getInstance() {
		if (!CommunityService.instance) {
			CommunityService.instance = new CommunityService();
		}
		return CommunityService.instance;
	}

	/** @private */
	constructor() {}

	/**
	 * Create a new community owned by the given instructor.
	 * Auto-creates the owner's CommunityMember record.
	 */
	create = async (instructorId, data) => {
		const community = await Community.create({
			...data,
			ownerId: instructorId,
		});

		await CommunityMember.create({
			communityId: community._id,
			userId: instructorId,
			userType: "instructor",
			role: "owner",
			status: "active",
			joinedAt: new Date(),
		});

		return Community.findByIdAndUpdate(
			community._id,
			{ $inc: { memberCount: 1 } },
			{ new: true },
		);
	};

	/**
	 * List active communities with optional search/filter/pagination.
	 */
	list = async (
		{
			search,
			category,
			visibility,
			page = 1,
			limit = 20,
			sort = "createdAt",
		} = {},
		requesterId = null,
	) => {
		const query = { status: "active" };

		query.visibility = visibility || "public";

		if (category) {
			query.category = category;
		}

		if (search) {
			query.$text = { $search: search };
		}

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
		const skip = (pageNum - 1) * limitNum;

		const [data, total] = await Promise.all([
			Community.find(query)
				.sort(search ? { score: { $meta: "textScore" } } : { [sort]: -1 })
				.skip(skip)
				.limit(limitNum)
				.lean(),
			Community.countDocuments(query),
		]);

		// If a user is logged in, look up all their memberships for these communities in one query
		const membershipMap = new Map();
		if (requesterId && data.length > 0) {
			const communityIds = data.map((c) => c._id);
			const memberships = await CommunityMember.find({
				userId: requesterId,
				communityId: { $in: communityIds },
			}).lean();
			for (const m of memberships) {
				membershipMap.set(String(m.communityId), m);
			}
		}

		const enriched = data.map((c) => {
			const resolved = resolveCoverImage(c);
			const membership = membershipMap.get(String(c._id)) ?? null;
			return {
				...resolved,
				isMember: membership?.status === "active",
				membershipStatus: membership?.status ?? null,
				membershipRole: membership?.role ?? null,
			};
		});

		return {
			data: enriched,
			page: pageNum,
			limit: limitNum,
			total,
			hasMore: skip + data.length < total,
		};
	};

	/**
	 * Get a community by its slug. Optionally include the requester's membership.
	 */
	getBySlug = async (slug, requesterId) => {
		console.log(slug);
		const community = await Community.findOne({
			slug,
			status: "active",
		}).lean();

		if (!community) {
			throwNotFoundError("Community not found.");
		}

		resolveCoverImage(community);

		let membership = null;
		if (requesterId) {
			membership = await CommunityMember.findOne({
				communityId: community._id,
				userId: requesterId,
			}).lean();
		}

		return { community, membership };
	};

	/**
	 * Update community fields. Requester must be owner or admin.
	 * If name changes, slug auto-regenerates via the pre-validate hook.
	 */
	update = async (slug, requesterId, data) => {
		const community = await Community.findOne({ slug, status: "active" });
		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const member = await CommunityMember.findOne({
			communityId: community._id,
			userId: requesterId,
			status: "active",
			role: { $in: ["owner", "admin"] },
		});

		if (!member) {
			throwForbiddenError(
				"You do not have permission to update this community.",
			);
		}

		const ALLOWED_FIELDS = [
			"name",
			"description",
			"category",
			"coverImage",
			"visibility",
			"requireApproval",
			"allowInvites",
			"paymentRequired",
			"monthlyPrice",
			"settings",
		];

		for (const field of ALLOWED_FIELDS) {
			if (data[field] !== undefined) {
				community[field] = data[field];
			}
		}

		await community.save();
		return resolveCoverImage(community.toObject());
	};

	/**
	 * Archive a community. Requester must be the owner.
	 */
	archive = async (slug, requesterId) => {
		const community = await Community.findOne({ slug, status: "active" });
		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const member = await CommunityMember.findOne({
			communityId: community._id,
			userId: requesterId,
			status: "active",
			role: "owner",
		});

		if (!member) {
			throwForbiddenError(
				"Only the community owner can archive this community.",
			);
		}

		community.status = "archived";
		await community.save();
		return community;
	};

	/**
	 * Get all communities owned by the given instructor (excluding archived).
	 */
	getMyCommunities = async (instructorId) => {
		const communities = await Community.find({
			ownerId: instructorId,
			status: { $ne: "archived" },
		})
			.sort({ createdAt: -1 })
			.lean();

		return communities.map(resolveCoverImage);
	};

	/**
	 * Get all communities where the user has an active membership.
	 * Works for any role — instructors also see communities they own.
	 */
	getJoinedCommunities = async (userId) => {
		const memberships = await CommunityMember.find({
			userId,
			status: "active",
		})
			.select("communityId")
			.lean();

		const communityIds = memberships.map((m) => m.communityId);
		if (communityIds.length === 0) return [];

		const communities = await Community.find({
			_id: { $in: communityIds },
			status: { $ne: "archived" },
		})
			.sort({ createdAt: -1 })
			.lean();

		return communities.map(resolveCoverImage);
	};
}
