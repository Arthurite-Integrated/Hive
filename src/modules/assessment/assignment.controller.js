import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { AssignmentService } from "#modules/assessment/assignment.service";

export class AssignmentController {
	static instance = null;

	/** @returns {AssignmentController} */
	static getInstance() {
		if (!AssignmentController.instance) {
			AssignmentController.instance = new AssignmentController();
		}
		return AssignmentController.instance;
	}

	/** @private */
	constructor() {
		this.assignmentService = AssignmentService.getInstance();
	}

	/**
	 * POST /lessons/:lessonId/assignment
	 */
	createAssignment = async (req, res) => {
		const data = await this.assignmentService.createAssignment(
			req.params.lessonId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Assignment created.", data },
			StatusCodes.CREATED,
		);
	};

	/**
	 * GET /assignments/:assignmentId
	 */
	getAssignment = async (req, res) => {
		const data = await this.assignmentService.getAssignment(
			req.params.assignmentId,
			req.user._id,
		);
		return sendSuccessResponse(res, { data });
	};

	/**
	 * POST /assignments/:assignmentId/upload-url
	 */
	getUploadUrl = async (req, res) => {
		const data = await this.assignmentService.getUploadUrl(
			req.params.assignmentId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, { data });
	};

	/**
	 * POST /assignments/:assignmentId/submit
	 */
	submitAssignment = async (req, res) => {
		const data = await this.assignmentService.submitAssignment(
			req.params.assignmentId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, { message: "Assignment submitted.", data });
	};

	/**
	 * GET /assignments/:assignmentId/submissions
	 */
	getSubmissions = async (req, res) => {
		const result = await this.assignmentService.getSubmissions(
			req.params.assignmentId,
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
	 * PATCH /submissions/:submissionId/grade
	 */
	gradeSubmission = async (req, res) => {
		const data = await this.assignmentService.gradeSubmission(
			req.params.submissionId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, { message: "Submission graded.", data });
	};

	/**
	 * POST /submissions/:submissionId/return
	 */
	returnSubmission = async (req, res) => {
		const data = await this.assignmentService.returnSubmission(
			req.params.submissionId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "Submission returned for revision.",
			data,
		});
	};
}
