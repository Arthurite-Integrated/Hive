import {
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { Course } from "#models/course.model";
import { Module } from "#models/module.model";
import { Lesson } from "#models/lesson.model";
import { Assignment } from "#models/assessment/assignment.model";
import { Quiz } from "#models/assessment/quiz.model";
import { Enrollment } from "#models/enrollment/enrollment.model";
import { LessonProgress } from "#models/enrollment/lesson-progress.model";
import { Certificate } from "#models/certificate.model";
import { S3Service } from "#services/s3.service";
import { EmailQueueService } from "#services/queues/email.queue.service";
import { EmailJobNames } from "#enums/queue/index";
import { config } from "#config/config";
import { getUserModel } from "#utils/user-model-router";

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
	constructor() {
		this.emailQueueService = EmailQueueService.getInstance();
	}

	/**
	 * Return full curriculum + per-lesson progress for the learning sidebar.
	 * Avoids N+1 by fetching all data in parallel.
	 */
	getCourseData = async (courseId, studentId) => {
		// 1. Find course (published, or archived for previously enrolled students)
		const course = await Course.findOne({
			_id: courseId,
			status: { $in: ["published", "archived"] },
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
					responseContentType: "application/pdf",
					responseContentDisposition: "inline",
				});
			}
		}

		if (obj.type === "assignment") {
			const assignment = await Assignment.findOne({ lessonId: obj._id })
				.select("_id")
				.lean();
			if (assignment) obj.assignmentId = String(assignment._id);
		}

		if (obj.type === "quiz") {
			const quiz = await Quiz.findOne({ lessonId: obj._id })
				.select("_id")
				.lean();
			if (quiz) obj.quizId = String(quiz._id);
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

			// Generate certificate (fire-and-forget)
			this._generateCertificate(
				studentId,
				lesson.courseId,
				enrollment._id,
			).catch((err) =>
				console.error("Failed to generate certificate:", err.message),
			);

			// Send course completion email (fire-and-forget)
			this._sendCompletionEmail(studentId, lesson.courseId).catch((err) =>
				console.error("Failed to send completion email:", err.message),
			);
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

	/** @private */
	_generateCertificate = async (studentId, courseId, enrollmentId) => {
		// Idempotency: one certificate per student per course
		const existing = await Certificate.findOne({ studentId, courseId });
		if (existing) return existing;

		const [course, instructorModel] = await Promise.all([
			Course.findById(courseId).select("title instructorId").lean(),
			getUserModel("instructor"),
		]);
		if (!course) return;

		const instructor = await instructorModel
			.findById(course.instructorId)
			.select("firstName lastName")
			.lean();

		const certNumber = `HIVE-CERT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
		const verificationCode = `HC-${studentId.toString().slice(-6)}-${courseId.toString().slice(-4)}-${Date.now().toString(36).toUpperCase()}`;

		const certificate = await Certificate.create({
			studentId,
			courseId,
			enrollmentId,
			certificateNumber: certNumber,
			certificateUrl: `/certificates/${certNumber}`,
			verificationCode,
			courseName: course.title,
			teacherName: instructor
				? `${instructor.firstName} ${instructor.lastName}`
				: "Hive Instructor",
			completionDate: new Date(),
		});

		return certificate;
	};

	/** @private */
	_sendCompletionEmail = async (studentId, courseId) => {
		const { Student } = await import("#modules/student/student.model");
		const [student, course] = await Promise.all([
			Student.findById(studentId).select("firstName email").lean(),
			Course.findById(courseId).select("title").lean(),
		]);
		if (!student || !course) return;

		this.emailQueueService.add(EmailJobNames.COURSE_COMPLETION, {
			message: {
				to: student.email,
				subject: `Congratulations! You completed ${course.title}!`,
			},
			template: "course-completion",
			locals: {
				name: student.firstName,
				courseTitle: course.title,
				certificateUrl: `${process.env.ROOT_DOMAIN || "https://tryhive.app"}/certificates`,
			},
		});
	};
}
