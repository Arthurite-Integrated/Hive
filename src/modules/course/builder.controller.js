import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { BuilderService } from "#modules/course/builder.service";

export class BuilderController {
	static instance = null;

	/** @returns {BuilderController} */
	static getInstance() {
		if (!BuilderController.instance) {
			BuilderController.instance = new BuilderController();
		}
		return BuilderController.instance;
	}

	/** @private */
	constructor() {
		this.builderService = BuilderService.getInstance();
	}

	// ─── Modules ──────────────────────────────────────────────────────────────

	createModule = async (req, res) => {
		const data = await this.builderService.createModule(
			req.params.courseId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Module created successfully.", data },
			StatusCodes.CREATED,
		);
	};

	reorderModules = async (req, res) => {
		const data = await this.builderService.reorderModules(
			req.params.courseId,
			req.user._id,
			req.body.items,
		);
		return sendSuccessResponse(res, {
			message: "Modules reordered successfully.",
			data,
		});
	};

	updateModule = async (req, res) => {
		const data = await this.builderService.updateModule(
			req.params.moduleId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "Module updated successfully.",
			data,
		});
	};

	deleteModule = async (req, res) => {
		await this.builderService.deleteModule(req.params.moduleId, req.user._id);
		return sendSuccessResponse(res, {
			message: "Module deleted successfully.",
		});
	};

	getCurriculum = async (req, res) => {
		const data = await this.builderService.getCurriculum(
			req.params.courseId,
			req.user._id,
		);
		return sendSuccessResponse(res, { data });
	};

	// ─── Lessons ──────────────────────────────────────────────────────────────

	createLesson = async (req, res) => {
		const data = await this.builderService.createLesson(
			req.params.moduleId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Lesson created successfully.", data },
			StatusCodes.CREATED,
		);
	};

	updateLesson = async (req, res) => {
		const data = await this.builderService.updateLesson(
			req.params.lessonId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "Lesson updated successfully.",
			data,
		});
	};

	deleteLesson = async (req, res) => {
		await this.builderService.deleteLesson(req.params.lessonId, req.user._id);
		return sendSuccessResponse(res, {
			message: "Lesson deleted successfully.",
		});
	};

	// ─── Uploads ──────────────────────────────────────────────────────────────

	getVideoUploadUrl = async (req, res) => {
		const data = await this.builderService.getVideoUploadUrl(
			req.params.lessonId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, { data });
	};

	finalizeVideo = async (req, res) => {
		const data = await this.builderService.finalizeVideo(
			req.params.lessonId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "Video finalized successfully.",
			data,
		});
	};

	getPdfUploadUrl = async (req, res) => {
		const data = await this.builderService.getPdfUploadUrl(
			req.params.lessonId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, { data });
	};

	finalizePdf = async (req, res) => {
		const data = await this.builderService.finalizePdf(
			req.params.lessonId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "PDF finalized successfully.",
			data,
		});
	};

	addAttachment = async (req, res) => {
		const data = await this.builderService.addAttachment(
			req.params.lessonId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Attachment added successfully.", data },
			StatusCodes.CREATED,
		);
	};
}
