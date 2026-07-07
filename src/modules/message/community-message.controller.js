import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { CommunityMessageService } from "#modules/message/community-message.service";

export class CommunityMessageController {
	static instance = null;

	/** @returns {CommunityMessageController} */
	static getInstance() {
		if (!CommunityMessageController.instance) {
			CommunityMessageController.instance = new CommunityMessageController();
		}
		return CommunityMessageController.instance;
	}

	/** @private */
	constructor() {
		this.service = CommunityMessageService.getInstance();
	}

	// POST /communities/:communityId/messages
	send = async (req, res) => {
		const data = await this.service.send(
			req.user._id,
			req.user.userType,
			req.params.communityId,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ data, message: "Message sent." },
			StatusCodes.CREATED,
		);
	};

	// GET /communities/:communityId/messages
	getMessages = async (req, res) => {
		const data = await this.service.getMessages(
			req.user._id,
			req.params.communityId,
			req.query,
		);
		return sendSuccessResponse(res, { ...data });
	};

	// DELETE /community-messages/:messageId
	deleteMessage = async (req, res) => {
		await this.service.deleteMessage(req.user._id, req.params.messageId);
		return sendSuccessResponse(res, { message: "Message deleted." });
	};
}
