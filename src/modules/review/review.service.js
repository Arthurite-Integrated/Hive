import { Types } from "mongoose";
import {
	throwConflictError,
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { Review } from "#models/review.model";
import { Course } from "#models/course.model";
import { Enrollment } from "#models/enrollment/enrollment.model";
import { Student } from "#modules/student/student.model";

async function recalcCourseRating(courseId) {
	const [r] = await Review.aggregate([
		{ $match: { courseId: new Types.ObjectId(courseId), status: "visible" } },
		{
			$group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } },
		},
	]);
	await Course.findByIdAndUpdate(courseId, {
		averageRating: r ? Math.round(r.avgRating * 10) / 10 : 0,
	});
}

export class ReviewService {
	static instance = null;

	/** @returns {ReviewService} */
	static getInstance() {
		if (!ReviewService.instance) ReviewService.instance = new ReviewService();
		return ReviewService.instance;
	}

	/** @private */
	constructor() {}

	createReview = async (studentId, courseId, { rating, title, comment }) => {
		// Must be enrolled
		const enrollment = await Enrollment.findOne({ studentId, courseId });
		if (!enrollment)
			throwForbiddenError("You must be enrolled to review this course.");

		// Check for duplicate review
		const existing = await Review.findOne({ studentId, courseId });
		if (existing) throwConflictError("You have already reviewed this course.");

		const review = await Review.create({
			studentId,
			courseId,
			enrollmentId: enrollment._id,
			rating,
			title,
			comment,
		});

		await recalcCourseRating(courseId);

		const student = await Student.findById(studentId)
			.select("firstName lastName profilePhoto")
			.lean();
		return this.#formatReview(review, studentId, student);
	};

	getReviews = async (
		courseId,
		{ sort = "recent", page = 1, limit = 10 } = {},
		requesterId,
	) => {
		const filter = {
			courseId: new Types.ObjectId(courseId),
			status: "visible",
		};
		const sortMap = {
			recent: { createdAt: -1 },
			highest: { rating: -1 },
			lowest: { rating: 1 },
			helpful: { helpfulCount: -1 },
		};
		const sortObj = sortMap[sort] ?? { createdAt: -1 };
		const skip = (Number(page) - 1) * Number(limit);

		const [reviews, total, agg] = await Promise.all([
			Review.find(filter).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
			Review.countDocuments(filter),
			Review.aggregate([
				{ $match: filter },
				{
					$group: {
						_id: null,
						avg: { $avg: "$rating" },
						count: { $sum: 1 },
						r5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
						r4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
						r3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
						r2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
						r1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
					},
				},
			]),
		]);

		// Enrich with student names
		const enriched = await Promise.all(
			reviews.map(async (r) => {
				try {
					const u = await Student.findById(r.studentId)
						.select("firstName lastName profilePhoto")
						.lean();
					return this.#formatReview(r, requesterId, u);
				} catch {
					return this.#formatReview(r, requesterId, null);
				}
			}),
		);

		const stats = agg[0] ?? {
			avg: 0,
			count: 0,
			r5: 0,
			r4: 0,
			r3: 0,
			r2: 0,
			r1: 0,
		};

		return {
			data: enriched,
			page: Number(page),
			limit: Number(limit),
			total,
			hasMore: Number(page) * Number(limit) < total,
			summary: {
				avg: stats.avg ? Math.round(stats.avg * 10) / 10 : 0,
				count: stats.count,
				breakdown: {
					5: stats.r5,
					4: stats.r4,
					3: stats.r3,
					2: stats.r2,
					1: stats.r1,
				},
			},
		};
	};

	updateReview = async (studentId, reviewId, payload) => {
		const review = await Review.findById(reviewId);
		if (!review) throwNotFoundError("Review not found.");
		if (String(review.studentId) !== String(studentId))
			throwForbiddenError("Not your review.");

		if (payload.rating != null) review.rating = payload.rating;
		if (payload.title !== undefined) review.title = payload.title;
		if (payload.comment !== undefined) review.comment = payload.comment;
		review.isEdited = true;
		review.editedAt = new Date();
		await review.save();

		await recalcCourseRating(review.courseId);

		const student = await Student.findById(studentId)
			.select("firstName lastName profilePhoto")
			.lean();
		return this.#formatReview(review, studentId, student);
	};

	deleteReview = async (studentId, reviewId) => {
		const review = await Review.findById(reviewId);
		if (!review) throwNotFoundError("Review not found.");
		if (String(review.studentId) !== String(studentId))
			throwForbiddenError("Not your review.");
		await review.deleteOne();
		await recalcCourseRating(review.courseId);
	};

	toggleHelpful = async (userId, reviewId) => {
		const review = await Review.findById(reviewId);
		if (!review) throwNotFoundError("Review not found.");

		const uid = new Types.ObjectId(userId);
		const idx = review.helpfulVotes.findIndex((v) => v.equals(uid));
		if (idx === -1) {
			review.helpfulVotes.push(uid);
			review.helpfulCount += 1;
		} else {
			review.helpfulVotes.splice(idx, 1);
			review.helpfulCount = Math.max(0, review.helpfulCount - 1);
		}
		await review.save();
		return { helpfulCount: review.helpfulCount };
	};

	#formatReview = (review, requesterId, user = null) => {
		const r = review.toObject ? review.toObject() : review;
		return {
			_id: r._id,
			studentId: r.studentId,
			userName: user ? `${user.firstName} ${user.lastName}` : "User",
			userAvatar: user?.profilePhoto ?? undefined,
			rating: r.rating,
			title: r.title,
			comment: r.comment,
			helpfulCount: r.helpfulCount,
			hasMarkedHelpful: requesterId
				? (r.helpfulVotes ?? []).some((v) => String(v) === String(requesterId))
				: false,
			instructorReply: r.instructorReply?.content
				? r.instructorReply
				: undefined,
			isEdited: r.isEdited,
			status: r.status,
			createdAt: r.createdAt,
		};
	};
}
