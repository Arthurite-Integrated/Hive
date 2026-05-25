import Router from "express";
import { authenticate } from "#middlewares/authenticate";
import { ReviewController } from "#modules/review/review.controller";

export const reviewRouter = Router();

const controller = ReviewController.getInstance();

// POST /courses/:courseId/reviews
reviewRouter.post(
	"/courses/:courseId/reviews",
	authenticate,
	controller.createReview,
);

// GET /courses/:courseId/reviews
reviewRouter.get(
	"/courses/:courseId/reviews",
	authenticate,
	controller.getReviews,
);

// PATCH /reviews/:id
reviewRouter.patch("/reviews/:id", authenticate, controller.updateReview);

// DELETE /reviews/:id
reviewRouter.delete("/reviews/:id", authenticate, controller.deleteReview);

// POST /reviews/:id/helpful
reviewRouter.post(
	"/reviews/:id/helpful",
	authenticate,
	controller.toggleHelpful,
);
