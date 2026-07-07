import { randomUUID } from "crypto";
import {
	throwBadRequestError,
	throwNotFoundError,
	throwForbiddenError,
} from "#helpers/errors/throw-error";
import { Assignment } from "#models/assessment/assignment.model";
import { AssignmentSubmission } from "#models/assessment/assignment-submission.model";
import { Lesson } from "#models/lesson.model";
import { Course } from "#models/course.model";
import { LessonProgress } from "#models/enrollment/lesson-progress.model";
import { Enrollment } from "#models/enrollment/enrollment.model";

export class AssignmentService {
	static instance = null;

	/** @returns {AssignmentService} */
	static getInstance() {
		if (!AssignmentService.instance) {
			AssignmentService.instance = new AssignmentService();
		}
		return AssignmentService.instance;
	}

	/** @private */
	constructor() {}

	/**
	 * Instructor creates an assignment for a lesson.
	 */
	createAssignment = async (lessonId, instructorId, payload) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			type: "assignment",
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Assignment lesson not found.");

		const course = await Course.findById(lesson.courseId);
		if (!course || String(course.instructorId) !== String(instructorId)) {
			throwForbiddenError(
				"You do not have permission to create an assignment for this lesson.",
			);
		}

		const existing = await Assignment.findOne({ lessonId });
		if (existing)
			throwBadRequestError("An assignment already exists for this lesson.");

		const assignment = await Assignment.create({ lessonId, ...payload });
		return assignment;
	};

	/**
	 * Get assignment by ID. Also returns the student's submission if one exists.
	 */
	getAssignment = async (assignmentId, userId) => {
		const assignment = await Assignment.findById(assignmentId);
		if (!assignment) throwNotFoundError("Assignment not found.");

		const submission = await AssignmentSubmission.findOne({
			assignmentId,
			studentId: userId,
		});

		return { assignment, submission: submission || null };
	};

	/**
	 * Generate a presigned S3 upload URL for file submission.
	 */
	getUploadUrl = async (
		assignmentId,
		userId,
		{ fileName, contentType, size },
	) => {
		const assignment = await Assignment.findById(assignmentId);
		if (!assignment) throwNotFoundError("Assignment not found.");

		if (assignment.maxFileSize && size > assignment.maxFileSize * 1024 * 1024) {
			throwBadRequestError(
				`File size exceeds the ${assignment.maxFileSize}MB limit.`,
			);
		}

		const lesson = await Lesson.findById(assignment.lessonId);

		const key = `assignments/${lesson.courseId}/${assignmentId}/${userId}/${randomUUID()}-${fileName}`;

		const { S3Service } = await import("#services/s3.service");
		const s3 = S3Service.getInstance();
		const { url: uploadUrl } = await s3.generatePresignedUploadUrl({
			key,
			contentType,
			expiresIn: 1800,
		});

		return { uploadUrl, key };
	};

	/**
	 * Student submits (or re-submits if returned) an assignment.
	 */
	submitAssignment = async (
		assignmentId,
		studentId,
		{ textContent, fileSubmissions },
	) => {
		const assignment = await Assignment.findById(assignmentId);
		if (!assignment) throwNotFoundError("Assignment not found.");

		// Validate submission type requirements
		if (assignment.submissionType === "text" && !textContent) {
			throwBadRequestError("Text content is required.");
		}
		if (
			assignment.submissionType === "file" &&
			(!fileSubmissions || fileSubmissions.length === 0)
		) {
			throwBadRequestError("At least one file submission is required.");
		}

		// Upsert submission (allows resubmission if returned)
		let submission = await AssignmentSubmission.findOne({
			assignmentId,
			studentId,
		});
		if (submission && submission.status === "graded") {
			throwBadRequestError("This assignment has already been graded.");
		}

		if (!submission) {
			submission = new AssignmentSubmission({ assignmentId, studentId });
		}

		if (textContent !== undefined) submission.textSubmission = textContent;
		if (fileSubmissions) submission.fileSubmissions = fileSubmissions;
		submission.status = "submitted";
		submission.submittedAt = new Date();
		await submission.save();

		return submission;
	};

	/**
	 * Instructor views all submissions for an assignment (paginated).
	 */
	getSubmissions = async (
		assignmentId,
		instructorId,
		{ page = 1, limit = 20, status } = {},
	) => {
		const assignment = await Assignment.findById(assignmentId);
		if (!assignment) throwNotFoundError("Assignment not found.");

		const lesson = await Lesson.findById(assignment.lessonId);
		const course = await Course.findById(lesson?.courseId);
		if (!course || String(course.instructorId) !== String(instructorId)) {
			throwForbiddenError("You do not have permission to view submissions.");
		}

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
		const skip = (pageNum - 1) * limitNum;

		const filter = { assignmentId };
		if (status) filter.status = status;

		const [data, total] = await Promise.all([
			AssignmentSubmission.find(filter)
				.sort({ submittedAt: -1 })
				.skip(skip)
				.limit(limitNum)
				.lean(),
			AssignmentSubmission.countDocuments(filter),
		]);

		return {
			data,
			page: pageNum,
			limit: limitNum,
			total,
			hasMore: pageNum * limitNum < total,
		};
	};

	/**
	 * Instructor grades a submission. Marks lesson progress complete and
	 * recalculates overall enrollment progress.
	 */
	gradeSubmission = async (submissionId, instructorId, { score, feedback }) => {
		const submission = await AssignmentSubmission.findById(submissionId);
		if (!submission) throwNotFoundError("Submission not found.");

		const assignment = await Assignment.findById(submission.assignmentId);
		const lesson = await Lesson.findById(assignment?.lessonId);
		const course = await Course.findById(lesson?.courseId);
		if (!course || String(course.instructorId) !== String(instructorId)) {
			throwForbiddenError("You do not have permission to grade this.");
		}

		if (score > assignment.maxScore) {
			throwBadRequestError(
				`Score cannot exceed max score of ${assignment.maxScore}.`,
			);
		}

		submission.score = score;
		submission.feedback = feedback;
		submission.status = "graded";
		submission.gradedBy = instructorId;
		submission.gradedAt = new Date();
		await submission.save();

		// Mark lesson progress complete
		await LessonProgress.findOneAndUpdate(
			{
				studentId: submission.studentId,
				lessonId: assignment.lessonId,
				courseId: lesson.courseId,
			},
			{ $set: { completed: true, completedAt: new Date(), progress: 100 } },
			{ upsert: true },
		);

		// Recalculate enrollment progress
		const totalLessons = await Lesson.countDocuments({
			courseId: lesson.courseId,
			status: "published",
		});
		const completedLessons = await LessonProgress.countDocuments({
			studentId: submission.studentId,
			courseId: lesson.courseId,
			completed: true,
		});
		const progressPct =
			totalLessons > 0
				? Math.round((completedLessons / totalLessons) * 100)
				: 0;
		await Enrollment.findOneAndUpdate(
			{ studentId: submission.studentId, courseId: lesson.courseId },
			{ $set: { progress: progressPct } },
		);

		return submission;
	};

	/**
	 * Instructor returns a submission for revision.
	 */
	returnSubmission = async (submissionId, instructorId, { feedback }) => {
		const submission = await AssignmentSubmission.findById(submissionId);
		if (!submission) throwNotFoundError("Submission not found.");

		const assignment = await Assignment.findById(submission.assignmentId);
		const lesson = await Lesson.findById(assignment?.lessonId);
		const course = await Course.findById(lesson?.courseId);
		if (!course || String(course.instructorId) !== String(instructorId)) {
			throwForbiddenError("You do not have permission.");
		}

		submission.status = "returned";
		submission.feedback = feedback;
		await submission.save();

		return submission;
	};
}
