import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { QuizService } from "#modules/assessment/quiz.service";

export class QuizController {
	static instance = null;

	/** @returns {QuizController} */
	static getInstance() {
		if (!QuizController.instance) {
			QuizController.instance = new QuizController();
		}
		return QuizController.instance;
	}

	/** @private */
	constructor() {
		this.quizService = QuizService.getInstance();
	}

	/**
	 * POST /lessons/:lessonId/quiz
	 */
	createQuiz = async (req, res) => {
		const data = await this.quizService.createQuiz(
			req.params.lessonId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Quiz created.", data },
			StatusCodes.CREATED,
		);
	};

	/**
	 * GET /quizzes/:quizId
	 */
	getQuiz = async (req, res) => {
		const data = await this.quizService.getQuiz(
			req.params.quizId,
			req.user._id,
			req.user.userType,
		);
		return sendSuccessResponse(res, { data });
	};

	/**
	 * PATCH /quizzes/:quizId
	 */
	updateQuiz = async (req, res) => {
		const data = await this.quizService.updateQuiz(
			req.params.quizId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, { message: "Quiz updated.", data });
	};

	/**
	 * POST /quizzes/:quizId/start
	 */
	startAttempt = async (req, res) => {
		const data = await this.quizService.startAttempt(
			req.params.quizId,
			req.user._id,
		);
		return sendSuccessResponse(res, { data });
	};

	/**
	 * POST /quizzes/:quizId/submit
	 */
	submitAttempt = async (req, res) => {
		const data = await this.quizService.submitAttempt(
			req.params.quizId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, { message: "Quiz submitted.", data });
	};

	/**
	 * GET /quizzes/:quizId/attempts
	 */
	getAttempts = async (req, res) => {
		const data = await this.quizService.getAttempts(
			req.params.quizId,
			req.user._id,
			req.user.userType,
		);
		return sendSuccessResponse(res, { data });
	};
}
