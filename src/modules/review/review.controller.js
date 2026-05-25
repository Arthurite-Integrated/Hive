import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { ReviewService } from "#modules/review/review.service";

export class ReviewController {
	static instance = null;

	/** @returns {ReviewController} */
	static getInstance() {
		if (!ReviewController.instance)
			ReviewController.instance = new ReviewController();
		return ReviewController.instance;
	}

	/** @private */
	constructor() {
		this.reviewService = ReviewService.getInstance();
	}

	/**
	 * POST /courses/:courseId/reviews
	 */
	createReview = async (req, res) => {
		const review = await this.reviewService.createReview(
			req.user._id,
			req.params.courseId,
			req.body,
		);
		return sendSuccessResponse(res, { data: { review } }, StatusCodes.CREATED);
	};

	/**
	 * GET /courses/:courseId/reviews
	 */
	getReviews = async (req, res) => {
		const result = await this.reviewService.getReviews(
			req.params.courseId,
			req.query,
			req.user?._id ?? null,
		);
		return sendSuccessResponse(res, result);
	};

	/**
	 * PATCH /reviews/:id
	 */
	updateReview = async (req, res) => {
		const review = await this.reviewService.updateReview(
			req.user._id,
			req.params.id,
			req.body,
		);
		return sendSuccessResponse(res, { data: { review } });
	};

	/**
	 * DELETE /reviews/:id
	 */
	deleteReview = async (req, res) => {
		await this.reviewService.deleteReview(req.user._id, req.params.id);
		return sendSuccessResponse(res, { message: "Review deleted." });
	};

	/**
	 * POST /reviews/:id/helpful
	 */
	toggleHelpful = async (req, res) => {
		const result = await this.reviewService.toggleHelpful(
			req.user._id,
			req.params.id,
		);
		return sendSuccessResponse(res, { data: result });
	};
}
