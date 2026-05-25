import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { EnrollmentService } from "#modules/enrollment/enrollment.service";
import { LearningService } from "#modules/enrollment/learning.service";

export class EnrollmentController {
	static instance = null;

	/** @returns {EnrollmentController} */
	static getInstance() {
		if (!EnrollmentController.instance) {
			EnrollmentController.instance = new EnrollmentController();
		}
		return EnrollmentController.instance;
	}

	/** @private */
	constructor() {
		this.enrollmentService = EnrollmentService.getInstance();
		this.learningService = LearningService.getInstance();
	}

	/**
	 * POST /courses/:courseId/enroll
	 */
	enroll = async (req, res) => {
		const enrollment = await this.enrollmentService.enroll(
			req.user._id,
			req.params.courseId,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Successfully enrolled in course.", data: { enrollment } },
			StatusCodes.CREATED,
		);
	};

	/**
	 * GET /users/me/enrollments
	 */
	getMyEnrollments = async (req, res) => {
		const result = await this.enrollmentService.getMyEnrollments(
			req.user._id,
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

	/**
	 * GET /courses/:courseId/enrollment
	 */
	getEnrollmentForCourse = async (req, res) => {
		const enrollment = await this.enrollmentService.getEnrollmentForCourse(
			req.user._id,
			req.params.courseId,
		);
		return sendSuccessResponse(res, { data: { enrollment } });
	};

	/**
	 * GET /courses/:courseId/learning
	 */
	getCourseData = async (req, res) => {
		const data = await this.learningService.getCourseData(
			req.params.courseId,
			req.user._id,
		);
		return sendSuccessResponse(res, {
			data: {
				course: data.course,
				enrollment: data.enrollment,
				modules: data.modules,
			},
		});
	};

	/**
	 * GET /lessons/:lessonId/content
	 * Bouncer middleware runs before this — attaches req.lesson
	 */
	getLessonContent = async (req, res) => {
		const lesson = await this.learningService.getLessonContent(req.lesson);
		return sendSuccessResponse(res, { data: { lesson } });
	};

	/**
	 * POST /lessons/:lessonId/progress
	 */
	updateLessonProgress = async (req, res) => {
		const result = await this.learningService.updateLessonProgress(
			req.user._id,
			req.params.lessonId,
			req.body,
		);
		return sendSuccessResponse(res, { data: result });
	};

	/**
	 * GET /lessons/:lessonId/progress
	 */
	getLessonProgress = async (req, res) => {
		const lessonProgress =
			await this.learningService.getLessonProgressForStudent(
				req.user._id,
				req.params.lessonId,
			);
		return sendSuccessResponse(res, { data: { lessonProgress } });
	};
}
