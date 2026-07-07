import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { CommunityService } from "#modules/community/community.service";
import { S3Service } from "#services/s3.service";
import { v4 as uuid } from "uuid";
import { throwBadRequestError } from "#helpers/errors/throw-error";

export class CommunityController {
	static instance = null;

	/** @returns {CommunityController} */
	static getInstance() {
		if (!CommunityController.instance) {
			CommunityController.instance = new CommunityController();
		}
		return CommunityController.instance;
	}

	/** @private */
	constructor() {
		this.communityService = CommunityService.getInstance();
		this.s3Service = S3Service.getInstance();
	}

	create = async (req, res) => {
		const data = await this.communityService.create(req.user._id, req.body);
		return sendSuccessResponse(
			res,
			{ message: "Community created successfully.", data },
			StatusCodes.CREATED,
		);
	};

	list = async (req, res) => {
		const result = await this.communityService.list(
			req.query,
			req.user?._id ?? null,
		);
		return sendSuccessResponse(res, {
			data: result.data,
			page: result.page,
			limit: result.limit,
			total: result.total,
			hasMore: result.hasMore,
		});
	};

	getMyCommunities = async (req, res) => {
		const data = await this.communityService.getMyCommunities(req.user._id);
		return sendSuccessResponse(res, {
			message: "Communities retrieved successfully.",
			data,
		});
	};

	getJoinedCommunities = async (req, res) => {
		const data = await this.communityService.getJoinedCommunities(req.user._id);
		return sendSuccessResponse(res, {
			message: "Joined communities retrieved successfully.",
			data,
		});
	};

	getBySlug = async (req, res) => {
		const { community, membership } = await this.communityService.getBySlug(
			req.params.slug,
			req.user?._id,
		);
		return sendSuccessResponse(res, { community, membership });
	};

	update = async (req, res) => {
		const data = await this.communityService.update(
			req.params.slug,
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "Community updated successfully.",
			data,
		});
	};

	archive = async (req, res) => {
		await this.communityService.archive(req.params.slug, req.user._id);
		return sendSuccessResponse(res, {
			message: "Community archived successfully.",
		});
	};

	getCoverUploadUrl = async (req, res) => {
		const { contentType } = req.query;
		if (!contentType || !contentType.startsWith("image/")) {
			throwBadRequestError(
				"contentType query parameter must be an image MIME type.",
			);
		}

		const ext = contentType.split("/")[1];
		const key = `communities/${req.params.slug}/cover/${uuid()}.${ext}`;

		const { url: uploadUrl } = await this.s3Service.generatePresignedUploadUrl({
			key,
			contentType,
			expiresIn: 5 * 60,
		});

		return sendSuccessResponse(res, { data: { uploadUrl, key } });
	};
}
