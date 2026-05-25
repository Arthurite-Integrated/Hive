import { randomUUID } from "crypto";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { throwBadRequestError } from "#helpers/errors/throw-error";
import { CourseService } from "#modules/course/course.service";
import { S3Service } from "#services/s3.service";

export class CourseController {
	static instance = null;

	/** @returns {CourseController} */
	static getInstance() {
		if (!CourseController.instance) {
			CourseController.instance = new CourseController();
		}
		return CourseController.instance;
	}

	/** @private */
	constructor() {
		this.courseService = CourseService.getInstance();
		this.s3Service = S3Service.getInstance();
	}

	create = async (req, res) => {
		const data = await this.courseService.create(
			req.params.slug,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Course created successfully.", data },
			StatusCodes.CREATED,
		);
	};

	list = async (req, res) => {
		const result = await this.courseService.list(req.params.slug, req.query);
		return sendSuccessResponse(res, {
			data: result.data,
			page: result.page,
			limit: result.limit,
			total: result.total,
			hasMore: result.hasMore,
		});
	};

	getById = async (req, res) => {
		const requesterId = req.user?._id ?? null;
		const { course, instructor } = await this.courseService.getById(
			req.params.courseId,
			requesterId,
		);
		return sendSuccessResponse(res, { course, instructor });
	};

	update = async (req, res) => {
		const data = await this.courseService.update(
			req.params.courseId,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "Course updated successfully.",
			data,
		});
	};

	archive = async (req, res) => {
		await this.courseService.archive(req.params.courseId, req.user._id);
		return sendSuccessResponse(res, {
			message: "Course archived successfully.",
		});
	};

	publish = async (req, res) => {
		const data = await this.courseService.publish(
			req.params.courseId,
			req.user._id,
		);
		return sendSuccessResponse(res, {
			message: "Course published successfully.",
			data,
		});
	};

	getCoverUploadUrl = async (req, res) => {
		const { contentType } = req.query;
		if (!contentType || !contentType.startsWith("image/")) {
			throwBadRequestError("contentType must be an image MIME type.");
		}
		// Verify the requester owns this course before issuing an upload URL
		await this.courseService.verifyInstructor(
			req.params.courseId,
			req.user._id,
		);

		const ext = contentType.split("/")[1] || "jpg";
		const key = `courses/${req.params.courseId}/cover/${randomUUID()}.${ext}`;
		const { url: uploadUrl } = await this.s3Service.generatePresignedUploadUrl({
			key,
			contentType,
			expiresIn: 5 * 60,
		});
		return sendSuccessResponse(res, { data: { uploadUrl, key } });
	};
}
