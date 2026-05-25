import { randomUUID } from "crypto";
import {
	throwBadRequestError,
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { Course } from "#models/course.model";
import { Module } from "#models/module.model";
import { Lesson } from "#models/lesson.model";
import { config } from "#config/config";

const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB

export class BuilderService {
	static instance = null;

	/** @returns {BuilderService} */
	static getInstance() {
		if (!BuilderService.instance) {
			BuilderService.instance = new BuilderService();
		}
		return BuilderService.instance;
	}

	/** @private */
	constructor() {}

	// ─── Helpers ──────────────────────────────────────────────────────────────

	/** Find course and verify instructor ownership */
	#findCourseAndVerify = async (courseId, instructorId) => {
		const course = await Course.findOne({
			_id: courseId,
			status: { $ne: "archived" },
		});
		if (!course) throwNotFoundError("Course not found.");
		if (String(course.instructorId) !== String(instructorId))
			throwForbiddenError("You do not have permission to modify this course.");
		return course;
	};

	// ─── Module Operations ────────────────────────────────────────────────────

	createModule = async (courseId, instructorId, { title, description }) => {
		await this.#findCourseAndVerify(courseId, instructorId);

		const orderIndex = await Module.countDocuments({
			courseId,
			status: "active",
		});

		const module = await Module.create({
			courseId,
			title,
			description,
			orderIndex,
			status: "active",
		});

		return module;
	};

	reorderModules = async (courseId, instructorId, items) => {
		await this.#findCourseAndVerify(courseId, instructorId);

		const bulkOps = items.map(({ moduleId, orderIndex }) => ({
			updateOne: {
				filter: { _id: moduleId, courseId },
				update: { $set: { orderIndex } },
			},
		}));

		if (bulkOps.length > 0) {
			await Module.bulkWrite(bulkOps);
		}

		const modules = await Module.find({ courseId, status: "active" }).sort({
			orderIndex: 1,
		});
		return modules;
	};

	updateModule = async (moduleId, instructorId, data) => {
		const module = await Module.findById(moduleId);
		if (!module || module.status === "archived")
			throwNotFoundError("Module not found.");

		await this.#findCourseAndVerify(module.courseId, instructorId);

		if (data.title !== undefined) module.title = data.title;
		if (data.description !== undefined) module.description = data.description;
		await module.save();
		return module;
	};

	deleteModule = async (moduleId, instructorId) => {
		const module = await Module.findById(moduleId);
		if (!module || module.status === "archived")
			throwNotFoundError("Module not found.");

		await this.#findCourseAndVerify(module.courseId, instructorId);

		module.status = "archived";
		module.isDeleted = true;
		await module.save();

		await Lesson.updateMany({ moduleId }, { status: "archived" });
	};

	// ─── Lesson Operations ────────────────────────────────────────────────────

	createLesson = async (moduleId, instructorId, { title, type }) => {
		const module = await Module.findById(moduleId);
		if (!module || module.status === "archived")
			throwNotFoundError("Module not found.");

		await this.#findCourseAndVerify(module.courseId, instructorId);

		const orderIndex = await Lesson.countDocuments({ moduleId });

		const lesson = await Lesson.create({
			moduleId,
			courseId: module.courseId,
			title,
			type,
			orderIndex,
			status: "draft",
		});

		return lesson;
	};

	updateLesson = async (lessonId, instructorId, data) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Lesson not found.");

		await this.#findCourseAndVerify(lesson.courseId, instructorId);

		const ALLOWED = [
			"title",
			"isFreePreview",
			"dripDate",
			"scheduledAt",
			"duration",
			"meetingLink",
			"platform",
			"pdfUrl",
			"pdfKey",
			"textContent",
		];
		for (const field of ALLOWED) {
			if (data[field] !== undefined) {
				lesson[field] = data[field];
			}
		}

		if (data.status === "published") {
			// Validate required fields by type
			if (lesson.type === "video" && !lesson.videoKey && !lesson.videoUrl) {
				throwBadRequestError(
					"A video must be uploaded before publishing this lesson.",
				);
			}
			if (lesson.type === "pdf" && !lesson.pdfKey && !lesson.pdfUrl) {
				throwBadRequestError(
					"A PDF must be uploaded before publishing this lesson.",
				);
			}
			if (lesson.type === "live" && !lesson.scheduledAt) {
				throwBadRequestError(
					"A scheduled date is required to publish a live lesson.",
				);
			}
			if (lesson.type === "text" && !lesson.textContent?.trim()) {
				throwBadRequestError(
					"Text content is required before publishing a text lesson.",
				);
			}
			lesson.status = "published";
		}

		await lesson.save();
		return lesson;
	};

	deleteLesson = async (lessonId, instructorId) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Lesson not found.");

		await this.#findCourseAndVerify(lesson.courseId, instructorId);

		lesson.status = "archived";
		await lesson.save();
	};

	// ─── Upload Operations ────────────────────────────────────────────────────

	getVideoUploadUrl = async (
		lessonId,
		instructorId,
		{ contentType, sizeBytes },
	) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Lesson not found.");

		await this.#findCourseAndVerify(lesson.courseId, instructorId);

		if (sizeBytes > MAX_VIDEO_SIZE) {
			throwBadRequestError("File size exceeds the 5 GB limit.");
		}
		if (!contentType.startsWith("video/")) {
			throwBadRequestError("contentType must be a video/* MIME type.");
		}

		const key = `courses/${lesson.courseId}/videos/${lessonId}/${randomUUID()}.mp4`;

		const { S3Service } = await import("#services/s3.service");
		const s3 = S3Service.getInstance();
		const bucket =
			config.aws.s3.bucketPrivate || config.aws.s3.bucket || config.s3.bucket;
		const { url: uploadUrl } = await s3.generatePresignedUploadUrl({
			key,
			contentType,
			expiresIn: 3600,
		});

		return { uploadUrl, key, bucket };
	};

	finalizeVideo = async (lessonId, instructorId, { key }) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Lesson not found.");

		await this.#findCourseAndVerify(lesson.courseId, instructorId);

		const expectedPrefix = `courses/${lesson.courseId}/videos/${lessonId}/`;
		if (!key.startsWith(expectedPrefix)) {
			throwBadRequestError("Invalid video key.");
		}

		lesson.videoKey = key;
		lesson.status = "published";
		await lesson.save();

		return { lesson, mediaConvertJobId: null };
	};

	getPdfUploadUrl = async (lessonId, instructorId, { contentType }) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Lesson not found.");

		await this.#findCourseAndVerify(lesson.courseId, instructorId);

		if (contentType !== "application/pdf") {
			throwBadRequestError("contentType must be application/pdf.");
		}

		const key = `courses/${lesson.courseId}/pdfs/${lessonId}/${randomUUID()}.pdf`;

		const { S3Service } = await import("#services/s3.service");
		const s3 = S3Service.getInstance();
		const { url: uploadUrl } = await s3.generatePresignedUploadUrl({
			key,
			contentType,
			expiresIn: 1800, // 30 min
		});

		return { uploadUrl, key };
	};

	finalizePdf = async (lessonId, instructorId, { key }) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Lesson not found.");

		await this.#findCourseAndVerify(lesson.courseId, instructorId);

		const expectedPrefix = `courses/${lesson.courseId}/pdfs/${lessonId}/`;
		if (!key.startsWith(expectedPrefix)) {
			throwBadRequestError("Invalid PDF key.");
		}

		lesson.pdfKey = key;
		lesson.status = "published";
		await lesson.save();

		return lesson;
	};

	addAttachment = async (lessonId, instructorId, { name, key, size, type }) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Lesson not found.");

		await this.#findCourseAndVerify(lesson.courseId, instructorId);

		lesson.attachments.push({ name, url: key, size, type });
		await lesson.save();
		return lesson;
	};

	// ─── Curriculum read ──────────────────────────────────────────────────────

	getCurriculum = async (courseId, instructorId) => {
		await this.#findCourseAndVerify(courseId, instructorId);

		const modules = await Module.find({
			courseId,
			status: "active",
		})
			.sort({ orderIndex: 1 })
			.lean();

		const moduleIds = modules.map((m) => m._id);
		const lessons = await Lesson.find({
			moduleId: { $in: moduleIds },
			status: { $ne: "archived" },
		})
			.sort({ orderIndex: 1 })
			.lean();

		const lessonsByModule = {};
		for (const lesson of lessons) {
			const mid = String(lesson.moduleId);
			if (!lessonsByModule[mid]) lessonsByModule[mid] = [];
			lessonsByModule[mid].push(lesson);
		}

		return modules.map((m) => ({
			...m,
			lessons: lessonsByModule[String(m._id)] || [],
		}));
	};
}
