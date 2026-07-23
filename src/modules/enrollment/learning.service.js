import {
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { Course } from "#models/course.model";
import { Module } from "#models/module.model";
import { Lesson } from "#models/lesson.model";
import { Enrollment } from "#models/enrollment/enrollment.model";
import { LessonProgress } from "#models/enrollment/lesson-progress.model";
import { S3Service } from "#services/s3.service";
import { config } from "#config/config";

export class LearningService {
	static instance = null;

	/** @returns {LearningService} */
	static getInstance() {
		if (!LearningService.instance) {
			LearningService.instance = new LearningService();
		}
		return LearningService.instance;
	}

	/** @private */
	constructor() {}

	/**
	 * Return full curriculum + per-lesson progress for the learning sidebar.
	 * Avoids N+1 by fetching all data in parallel.
	 */
	getCourseData = async (courseId, studentId) => {
		// 1. Find course (published)
		const course = await Course.findOne({
			_id: courseId,
			status: "published",
		}).lean();
		if (!course) {
			throwNotFoundError("Course not found.");
		}

		// 2. Check enrollment (unless all lessons are free preview — handled per-lesson by Bouncer)
		const enrollment = await Enrollment.findOne({ studentId, courseId }).lean();
		if (!enrollment) {
			throwForbiddenError("You are not enrolled in this course.");
		}

		// 3. Get modules, lessons, and progress in parallel
		const [modules, lessons, progressDocs] = await Promise.all([
			Module.find({ courseId, status: "active" })
				.sort({ orderIndex: 1 })
				.lean(),
			Lesson.find({ courseId, status: { $ne: "archived" } })
				.sort({ orderIndex: 1 })
				.lean(),
			LessonProgress.find({ studentId, courseId }).lean(),
		]);

		// 4. Build progress map (lessonId → progress doc)
		const progressMap = new Map(
			progressDocs.map((p) => [p.lessonId.toString(), p]),
		);

		// 5. Group lessons by module and attach progress
		const modulesWithLessons = modules.map((m) => ({
			...m,
			lessons: lessons
				.filter((l) => l.moduleId.toString() === m._id.toString())
				.map((l) => ({
					...l,
					progress: progressMap.get(l._id.toString()) || {
						completed: false,
						progress: 0,
						watchedSeconds: 0,
					},
				})),
		}));

		return { course, enrollment, modules: modulesWithLessons };
	};

	/**
	 * Return lesson content with presigned S3 URLs so the browser can fetch media.
	 * Phase 8 will replace these with CloudFront signed URLs.
	 */
	getLessonContent = async (lesson) => {
		const obj = lesson.toObject ? lesson.toObject() : { ...lesson };

		const s3 = S3Service.getInstance();
		// Videos may live in the private bucket; fall back to the default bucket.
		const videoBucket =
			config.aws.s3.bucketPrivate || config.aws.s3.bucket || config.s3.bucket;
		const defaultBucket = config.aws.s3.bucket || config.s3.bucket;

		if (obj.type === "video") {
			const key = obj.videoKey;
			if (key) {
				obj.videoUrl = await s3.generatePresignedDownloadUrl({
					key,
					expiresIn: 3600,
					bucket: videoBucket,
				});
			}
		}

		if (obj.type === "pdf") {
			const key = obj.pdfKey;
			if (key) {
				obj.pdfUrl = await s3.generatePresignedDownloadUrl({
					key,
					expiresIn: 3600,
					bucket: defaultBucket,
				});
			}
		}

		if (obj.type === "drive") {
			// Build embed URL from file ID, fall back to raw driveUrl
			const fileId = obj.driveFileId;
			if (fileId) {
				obj.driveEmbedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
			} else {
				obj.driveEmbedUrl = obj.driveUrl ?? null;
			}
		}

		return obj;
	};

	/**
	 * POST /lessons/:lessonId/progress
	 * Save watch position and/or mark lesson complete. Updates overall enrollment progress.
	 */
	updateLessonProgress = async (
		studentId,
		lessonId,
		{ progress, lastPosition, completed },
	) => {
		// Verify lesson exists
		const lesson = await Lesson.findOne({
			_id: lessonId,
			status: { $ne: "archived" },
		}).lean();
		if (!lesson) throwNotFoundError("Lesson not found.");

		// Verify enrollment
		const enrollment = await Enrollment.findOne({
			studentId,
			courseId: lesson.courseId,
			status: "active",
		});
		if (!enrollment)
			throwForbiddenError("You are not enrolled in this course.");

		const now = new Date();

		let lessonProgress = await LessonProgress.findOne({ studentId, lessonId });

		if (!lessonProgress) {
			lessonProgress = await LessonProgress.create({
				studentId,
				lessonId,
				courseId: lesson.courseId,
				enrollmentId: enrollment._id,
				progress: progress ?? 0,
				lastPosition: lastPosition ?? 0,
				completed: false,
				lastAccessedAt: now,
			});
		} else {
			if (progress != null && progress > lessonProgress.progress)
				lessonProgress.progress = progress;
			if (lastPosition != null) lessonProgress.lastPosition = lastPosition;
			lessonProgress.lastAccessedAt = now;
		}

		// Mark complete (one-way latch)
		if (completed && !lessonProgress.completed) {
			lessonProgress.completed = true;
			lessonProgress.completedAt = now;
		}

		await lessonProgress.save();

		// Update enrollment progress
		const [total, done] = await Promise.all([
			Lesson.countDocuments({ courseId: lesson.courseId, status: "published" }),
			LessonProgress.countDocuments({
				enrollmentId: enrollment._id,
				completed: true,
			}),
		]);

		enrollment.progress = total > 0 ? Math.round((done / total) * 100) : 0;
		enrollment.lastAccessedAt = now;
		if (enrollment.progress === 100 && !enrollment.completedAt) {
			enrollment.completedAt = now;
		}
		await enrollment.save();

		return {
			lessonProgress: {
				lessonId: lessonProgress.lessonId,
				progress: lessonProgress.progress,
				lastPosition: lessonProgress.lastPosition,
				completed: lessonProgress.completed,
				completedAt: lessonProgress.completedAt,
				lastAccessedAt: lessonProgress.lastAccessedAt,
			},
			courseProgress: enrollment.progress,
		};
	};

	/**
	 * GET /lessons/:lessonId/progress
	 * Return progress for one lesson, defaulting to zeroes if none recorded yet.
	 */
	getLessonProgressForStudent = async (studentId, lessonId) => {
		const doc = await LessonProgress.findOne({ studentId, lessonId }).lean();
		return doc ?? { lessonId, progress: 0, lastPosition: 0, completed: false };
	};
}
