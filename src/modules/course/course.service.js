import {
	throwBadRequestError,
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { Community } from "#modules/community/community.model";
import { CommunityMember } from "#models/community-member.model";
import { Course } from "#models/course.model";
import { Lesson } from "#models/lesson.model";
import { getUserModel } from "#utils/user-model-router";
import { config } from "#config/config";

function resolveCourseCover(course) {
	if (!course || !course.coverImage) return course;
	if (course.coverImage.startsWith("http")) return course;
	course.coverImage = config.aws.cloudfront.domain
		? `https://${config.aws.cloudfront.domain}/${course.coverImage}`
		: `https://${config.aws.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${course.coverImage}`;
	return course;
}

export class CourseService {
	static instance = null;

	/** @returns {CourseService} */
	static getInstance() {
		if (!CourseService.instance) {
			CourseService.instance = new CourseService();
		}
		return CourseService.instance;
	}

	/** @private */
	constructor() {}

	/**
	 * Create a new course inside a community.
	 * Requester must be owner or admin of the community.
	 */
	create = async (communitySlug, instructorId, data) => {
		const community = await Community.findOne({
			slug: communitySlug,
			status: "active",
		});
		if (!community) throwNotFoundError("Community not found.");

		const member = await CommunityMember.findOne({
			communityId: community._id,
			userId: instructorId,
			status: "active",
			role: { $in: ["owner", "admin"] },
		});
		if (!member)
			throwForbiddenError(
				"You must be a community owner or admin to create a course.",
			);

		const course = await Course.create({
			...data,
			communityId: community._id,
			instructorId,
			status: "draft",
		});

		await Community.findByIdAndUpdate(community._id, {
			$inc: { courseCount: 1 },
		});

		return course;
	};

	/**
	 * List courses within a community.
	 */
	list = async (communitySlug, { status, page = 1, limit = 20 } = {}) => {
		const community = await Community.findOne({
			slug: communitySlug,
			status: "active",
		}).lean();
		if (!community) throwNotFoundError("Community not found.");

		const query = {
			communityId: community._id,
			status: status || { $in: ["draft", "published"] },
		};

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
		const skip = (pageNum - 1) * limitNum;

		const [data, total] = await Promise.all([
			Course.find(query)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limitNum)
				.lean(),
			Course.countDocuments(query),
		]);

		return {
			data: data.map(resolveCourseCover),
			page: pageNum,
			limit: limitNum,
			total,
			hasMore: skip + data.length < total,
		};
	};

	/**
	 * Get a single course by ID. Populates instructor info.
	 * Draft courses are only visible to their instructor.
	 */
	getById = async (courseId, requesterId) => {
		const course = await Course.findOne({
			_id: courseId,
			status: { $ne: "archived" },
		}).lean();
		if (!course) throwNotFoundError("Course not found.");

		if (
			course.status !== "published" &&
			String(course.instructorId) !== String(requesterId)
		) {
			throwForbiddenError("You do not have access to this course.");
		}

		// Populate instructor name
		let instructor = null;
		try {
			const InstructorModel = getUserModel("instructor");
			instructor = await InstructorModel.findById(course.instructorId)
				.select("firstName lastName profilePhoto")
				.lean();
		} catch {
			// non-critical
		}

		return { course: resolveCourseCover(course), instructor };
	};

	/**
	 * Update course fields. Requester must be the instructor who owns it.
	 */
	update = async (courseId, instructorId, data) => {
		const course = await Course.findOne({
			_id: courseId,
			status: { $ne: "archived" },
		});
		if (!course) throwNotFoundError("Course not found.");
		if (String(course.instructorId) !== String(instructorId))
			throwForbiddenError("You do not have permission to update this course.");

		const ALLOWED = [
			"title",
			"description",
			"category",
			"difficulty",
			"isFree",
			"price",
			"monthlyPrice",
			"coverImage",
			"settings",
			"certificateRequirements",
		];
		for (const field of ALLOWED) {
			if (data[field] !== undefined) {
				course[field] = data[field];
			}
		}

		await course.save();
		return resolveCourseCover(course.toObject());
	};

	/**
	 * Publish a course. Requires at least one published lesson.
	 */
	publish = async (courseId, instructorId) => {
		const course = await Course.findOne({
			_id: courseId,
			status: { $ne: "archived" },
		});
		if (!course) throwNotFoundError("Course not found.");
		if (String(course.instructorId) !== String(instructorId))
			throwForbiddenError("You do not have permission to publish this course.");

		const hasContent = await Lesson.findOne({
			courseId: course._id,
			status: "published",
		});
		if (!hasContent)
			throwBadRequestError(
				"Course needs at least one published lesson before it can be published.",
			);

		course.status = "published";
		course.publishedAt = new Date();
		await course.save();
		return course;
	};

	/**
	 * Archive a course. Instructor only.
	 */
	archive = async (courseId, instructorId) => {
		const course = await Course.findOne({
			_id: courseId,
			status: { $ne: "archived" },
		});
		if (!course) throwNotFoundError("Course not found.");
		if (String(course.instructorId) !== String(instructorId))
			throwForbiddenError("You do not have permission to archive this course.");

		const community = await Community.findById(course.communityId);
		if (community) {
			await Community.findByIdAndUpdate(course.communityId, {
				$inc: { courseCount: -1 },
			});
		}

		course.status = "archived";
		await course.save();
		return course;
	};

	verifyInstructor = async (courseId, instructorId) => {
		const course = await Course.findOne({
			_id: courseId,
			status: { $ne: "archived" },
		}).lean();
		if (!course) throwNotFoundError("Course not found.");
		if (String(course.instructorId) !== String(instructorId))
			throwForbiddenError("You do not have permission to modify this course.");
		return course;
	};
}
