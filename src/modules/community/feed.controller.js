import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { FeedService } from "#modules/community/feed.service";

export class FeedController {
	static instance = null;

	/** @returns {FeedController} */
	static getInstance() {
		if (!FeedController.instance) {
			FeedController.instance = new FeedController();
		}
		return FeedController.instance;
	}

	/** @private */
	constructor() {
		this.feedService = FeedService.getInstance();
	}

	createPost = async (req, res) => {
		const { slug } = req.params;
		const post = await this.feedService.createPost(
			slug,
			req.user._id,
			req.user.userType,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Post created successfully.", data: { post } },
			StatusCodes.CREATED,
		);
	};

	getPosts = async (req, res) => {
		const { slug } = req.params;
		// requesterId may come from optional auth — req.user if authenticated, else null
		const requesterId = req.user?._id ?? null;
		const result = await this.feedService.getPosts(
			slug,
			requesterId,
			req.query,
		);
		return sendSuccessResponse(res, {
			data: result.data,
			page: result.page,
			limit: result.limit,
			total: result.total,
			hasMore: result.hasMore,
		});
	};

	updatePost = async (req, res) => {
		const { slug, postId } = req.params;
		const post = await this.feedService.updatePost(
			postId,
			slug,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "Post updated successfully.",
			data: { post },
		});
	};

	deletePost = async (req, res) => {
		const { slug, postId } = req.params;
		await this.feedService.deletePost(postId, slug, req.user._id);
		return sendSuccessResponse(
			res,
			{ message: "Post deleted successfully." },
			StatusCodes.OK,
		);
	};

	toggleLike = async (req, res) => {
		const { postId } = req.params;
		const result = await this.feedService.toggleLike(
			postId,
			req.user._id,
			req.user.userType,
		);
		return sendSuccessResponse(res, { data: result });
	};

	togglePin = async (req, res) => {
		const { slug, postId } = req.params;
		const post = await this.feedService.togglePin(postId, slug, req.user._id);
		return sendSuccessResponse(res, {
			message: post.isPinned ? "Post pinned." : "Post unpinned.",
			data: { post },
		});
	};

	createComment = async (req, res) => {
		const { postId } = req.params;
		const comment = await this.feedService.createComment(
			postId,
			req.user._id,
			req.user.userType,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Comment created successfully.", data: { comment } },
			StatusCodes.CREATED,
		);
	};

	getComments = async (req, res) => {
		const { postId } = req.params;
		const result = await this.feedService.getComments(postId, req.query);
		return sendSuccessResponse(res, {
			data: result.data,
			page: result.page,
			limit: result.limit,
			total: result.total,
			hasMore: result.hasMore,
		});
	};
}
