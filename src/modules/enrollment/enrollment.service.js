import {
	throwBadRequestError,
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { Enrollment } from "#models/enrollment/enrollment.model";
import { LessonProgress } from "#models/enrollment/lesson-progress.model";
import { Course } from "#models/course.model";
import { Lesson } from "#models/lesson.model";
import { Community } from "#modules/community/community.model";
import { CommunityMember } from "#models/community-member.model";

export class EnrollmentService {
	static instance = null;

	/** @returns {EnrollmentService} */
	static getInstance() {
		if (!EnrollmentService.instance) {
			EnrollmentService.instance = new EnrollmentService();
		}
		return EnrollmentService.instance;
	}

	/** @private */
	constructor() {}

	/**
	 * Enroll a student in a course (free enrollment).
	 * Auto-joins the community if it is public + free.
	 */
	// referralCode reserved for Phase 6 (referral rewards)
	enroll = async (
		studentId,
		courseId,
		{ paymentType = "free", referralCode: _referralCode } = {},
	) => {
		// 1. Find course (published only)
		const course = await Course.findOne({ _id: courseId, status: "published" });
		if (!course) {
			throwNotFoundError("Course not found or not yet published.");
		}

		// 2. Check for existing active enrollment
		const existing = await Enrollment.findOne({ studentId, courseId });
		if (existing && existing.status === "active") {
			throwBadRequestError("You are already enrolled in this course.");
		}

		// 3. Community membership check
		const community = await Community.findById(course.communityId);
		if (!community) {
			throwNotFoundError("Community not found.");
		}

		const member = await CommunityMember.findOne({
			communityId: community._id,
			userId: studentId,
			status: "active",
		});

		if (!member) {
			// Auto-join if community is public and free
			if (community.visibility === "public" && !community.paymentRequired) {
				await CommunityMember.create({
					communityId: community._id,
					userId: studentId,
					userType: "student",
					role: "member",
					status: "active",
					joinedAt: new Date(),
				});
				await Community.findByIdAndUpdate(community._id, {
					$inc: { memberCount: 1 },
				});
			} else {
				throwForbiddenError(
					"You must join this community before enrolling in its courses.",
				);
			}
		}

		// 4. Paid enrollment guard — Phase 4 will wire Paystack
		if (!course.isFree && paymentType !== "free") {
			throwBadRequestError(
				"Paid enrollment is not yet available. Please check back soon.",
			);
		}

		// 5. Create enrollment
		const enrollment = await Enrollment.create({
			studentId,
			courseId,
			communityId: course.communityId,
			paymentType: "free",
			status: "active",
			enrolledAt: new Date(),
		});

		// 6. Increment course enrollment count
		await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

		// 7. Create LessonProgress stubs for all published lessons
		const lessons = await Lesson.find({ courseId, status: "published" });
		if (lessons.length > 0) {
			const stubs = lessons.map((l) => ({
				studentId,
				lessonId: l._id,
				courseId,
				enrollmentId: enrollment._id,
				completed: false,
				progress: 0,
				watchedSeconds: 0,
			}));

			// insertMany with ordered:false so duplicates (re-enroll edge case) don't blow up
			await LessonProgress.insertMany(stubs, { ordered: false }).catch(
				(err) => {
					// Ignore duplicate key errors (11000) gracefully
					if (err.code !== 11000 && err.name !== "BulkWriteError") throw err;
				},
			);
		}

		return enrollment;
	};

	/**
	 * Get all enrollments for the current student, with course data manually populated.
	 */
	getMyEnrollments = async (
		studentId,
		{ status, page = 1, limit = 20 } = {},
	) => {
		const query = { studentId };
		if (status) query.status = status;

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
		const skip = (pageNum - 1) * limitNum;

		const [enrollments, total] = await Promise.all([
			Enrollment.find(query)
				.sort({ enrolledAt: -1 })
				.skip(skip)
				.limit(limitNum)
				.lean(),
			Enrollment.countDocuments(query),
		]);

		if (enrollments.length === 0) {
			return {
				data: [],
				page: pageNum,
				limit: limitNum,
				total: 0,
				hasMore: false,
			};
		}

		// Manually populate courses
		const courseIds = enrollments.map((e) => e.courseId);
		const courses = await Course.find({ _id: { $in: courseIds } }).lean();
		const coursesById = new Map(courses.map((c) => [c._id.toString(), c]));

		const data = enrollments.map((e) => ({
			...e,
			course: coursesById.get(e.courseId.toString()) || null,
		}));

		return {
			data,
			page: pageNum,
			limit: limitNum,
			total,
			hasMore: skip + enrollments.length < total,
		};
	};

	/**
	 * Get the current student's enrollment for a specific course (or null).
	 */
	getEnrollmentForCourse = async (studentId, courseId) => {
		return Enrollment.findOne({ studentId, courseId }).lean();
	};
}
