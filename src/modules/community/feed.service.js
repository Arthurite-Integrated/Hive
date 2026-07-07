import {
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { Community } from "#modules/community/community.model";
import { CommunityMember } from "#models/community-member.model";
import { CommunityPost } from "#models/community-post.model";
import { PostLike } from "#models/post-like.model";
import { CommunityComment } from "#models/community-comment.model";

export class FeedService {
	static instance = null;

	/** @returns {FeedService} */
	static getInstance() {
		if (!FeedService.instance) {
			FeedService.instance = new FeedService();
		}
		return FeedService.instance;
	}

	/** @private */
	constructor() {}

	/**
	 * Verify the user is an active member of the community.
	 * @private
	 */
	_requireActiveMember = async (communityId, userId) => {
		const member = await CommunityMember.findOne({
			communityId,
			userId,
			status: "active",
		});
		if (!member) {
			throwForbiddenError(
				"You must be an active member to perform this action.",
			);
		}
		return member;
	};

	/**
	 * Create a new post in a community.
	 */
	createPost = async (
		communitySlug,
		authorId,
		authorType,
		{ content, attachments, isAnnouncement },
	) => {
		const community = await Community.findOne({
			slug: communitySlug,
			status: "active",
		}).lean();
		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const member = await this._requireActiveMember(community._id, authorId);

		if (isAnnouncement) {
			const isPrivileged = ["owner", "admin"].includes(member.role);
			if (!isPrivileged) {
				throwForbiddenError(
					"Only community owners and admins can create announcements.",
				);
			}
		}

		const post = await CommunityPost.create({
			communityId: community._id,
			authorId,
			authorType,
			content,
			attachments: attachments ?? [],
			isAnnouncement: isAnnouncement ?? false,
		});

		return post;
	};

	/**
	 * List paginated posts for a community.
	 */
	getPosts = async (
		communitySlug,
		requesterId,
		{ page = 1, limit = 20, pinned } = {},
	) => {
		const community = await Community.findOne({
			slug: communitySlug,
			status: "active",
		}).lean();
		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
		const skip = (pageNum - 1) * limitNum;

		const query = {
			communityId: community._id,
			status: "active",
		};

		if (pinned === "true") {
			query.isPinned = true;
		}

		const [posts, total] = await Promise.all([
			CommunityPost.find(query)
				.sort({ isPinned: -1, createdAt: -1 })
				.skip(skip)
				.limit(limitNum)
				.lean(),
			CommunityPost.countDocuments(query),
		]);

		// Inject liked state if requester is authenticated
		let likedPostIds = new Set();
		if (requesterId && posts.length > 0) {
			const postIds = posts.map((p) => p._id);
			const likedIds = await PostLike.distinct("postId", {
				postId: { $in: postIds },
				userId: requesterId,
			});
			likedPostIds = new Set(likedIds.map((id) => id.toString()));
		}

		const data = posts.map((p) => ({
			...p,
			liked: likedPostIds.has(p._id.toString()),
		}));

		return {
			data,
			page: pageNum,
			limit: limitNum,
			total,
			hasMore: skip + data.length < total,
		};
	};

	/**
	 * Update a post's content and/or attachments.
	 */
	updatePost = async (postId, communitySlug, requesterId, data) => {
		const community = await Community.findOne({
			slug: communitySlug,
			status: "active",
		}).lean();
		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const post = await CommunityPost.findOne({ _id: postId, status: "active" });
		if (!post) {
			throwNotFoundError("Post not found.");
		}

		// Author or community owner/admin can edit
		const isAuthor = post.authorId.toString() === requesterId.toString();
		if (!isAuthor) {
			const member = await CommunityMember.findOne({
				communityId: community._id,
				userId: requesterId,
				status: "active",
				role: { $in: ["owner", "admin"] },
			});
			if (!member) {
				throwForbiddenError("You do not have permission to edit this post.");
			}
		}

		if (data.content !== undefined) post.content = data.content;
		if (data.attachments !== undefined) post.attachments = data.attachments;

		await post.save();
		return post;
	};

	/**
	 * Soft-delete a post and hard-delete its likes and comments.
	 */
	deletePost = async (postId, communitySlug, requesterId) => {
		const community = await Community.findOne({
			slug: communitySlug,
			status: "active",
		}).lean();
		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const post = await CommunityPost.findOne({ _id: postId, status: "active" });
		if (!post) {
			throwNotFoundError("Post not found.");
		}

		const isAuthor = post.authorId.toString() === requesterId.toString();
		if (!isAuthor) {
			const member = await CommunityMember.findOne({
				communityId: community._id,
				userId: requesterId,
				status: "active",
				role: { $in: ["owner", "admin"] },
			});
			if (!member) {
				throwForbiddenError("You do not have permission to delete this post.");
			}
		}

		post.status = "deleted";
		await post.save();

		// Cascade hard-delete related records
		await Promise.all([
			PostLike.deleteMany({ postId: post._id }),
			CommunityComment.deleteMany({ postId: post._id }),
		]);
	};

	/**
	 * Toggle like on a post. Returns { liked, likeCount }.
	 */
	toggleLike = async (postId, userId, userType) => {
		const post = await CommunityPost.findOne({ _id: postId, status: "active" });
		if (!post) {
			throwNotFoundError("Post not found.");
		}

		try {
			await PostLike.create({ postId, userId, userType });
			const updated = await CommunityPost.findByIdAndUpdate(
				postId,
				{ $inc: { likeCount: 1 } },
				{ new: true },
			);
			return { liked: true, likeCount: updated.likeCount };
		} catch (err) {
			if (err.code === 11000) {
				// Already liked — unlike it
				await PostLike.deleteOne({ postId, userId });
				const updated = await CommunityPost.findByIdAndUpdate(
					postId,
					{ $inc: { likeCount: -1 } },
					{ new: true },
				);
				return { liked: false, likeCount: Math.max(0, updated.likeCount) };
			}
			throw err;
		}
	};

	/**
	 * Toggle pin on a post (owner/admin only).
	 */
	togglePin = async (postId, communitySlug, requesterId) => {
		const community = await Community.findOne({
			slug: communitySlug,
			status: "active",
		}).lean();
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
			throwForbiddenError("Only community owners and admins can pin posts.");
		}

		const post = await CommunityPost.findOne({ _id: postId, status: "active" });
		if (!post) {
			throwNotFoundError("Post not found.");
		}

		post.isPinned = !post.isPinned;
		await post.save();
		return post;
	};

	/**
	 * Create a comment on a post.
	 */
	createComment = async (postId, authorId, authorType, { content }) => {
		const post = await CommunityPost.findOne({
			_id: postId,
			status: "active",
		}).lean();
		if (!post) {
			throwNotFoundError("Post not found.");
		}

		const community = await Community.findById(post.communityId).lean();
		if (!community) {
			throwNotFoundError("Community not found.");
		}

		await this._requireActiveMember(community._id, authorId);

		const comment = await CommunityComment.create({
			postId,
			authorId,
			authorType,
			content,
		});

		await CommunityPost.findByIdAndUpdate(postId, {
			$inc: { commentCount: 1 },
		});

		return comment;
	};

	/**
	 * List paginated comments for a post.
	 */
	getComments = async (postId, { page = 1, limit = 20 } = {}) => {
		const post = await CommunityPost.findOne({
			_id: postId,
			status: "active",
		}).lean();
		if (!post) {
			throwNotFoundError("Post not found.");
		}

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
		const skip = (pageNum - 1) * limitNum;

		const query = { postId, status: "active" };

		const [data, total] = await Promise.all([
			CommunityComment.find(query)
				.sort({ createdAt: 1 })
				.skip(skip)
				.limit(limitNum)
				.lean(),
			CommunityComment.countDocuments(query),
		]);

		return {
			data,
			page: pageNum,
			limit: limitNum,
			total,
			hasMore: skip + data.length < total,
		};
	};
}
