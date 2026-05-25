import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { MessageService } from "#modules/message/message.service";

export class MessageController {
	static instance = null;

	/** @returns {MessageController} */
	static getInstance() {
		if (!MessageController.instance) {
			MessageController.instance = new MessageController();
		}
		return MessageController.instance;
	}

	/** @private */
	constructor() {
		this.messageService = MessageService.getInstance();
	}

	// POST /messages
	send = async (req, res) => {
		const data = await this.messageService.send(req.user._id, req.body);
		return sendSuccessResponse(
			res,
			{ data, message: "Message sent." },
			StatusCodes.CREATED,
		);
	};

	// GET /messages/conversations
	getConversations = async (req, res) => {
		const data = await this.messageService.getConversations(
			req.user._id,
			req.query,
		);
		return sendSuccessResponse(res, { ...data });
	};

	// GET /messages/unread-count
	getUnreadCount = async (req, res) => {
		const count = await this.messageService.getUnreadCount(req.user._id);
		return sendSuccessResponse(res, { data: { count } });
	};

	// GET /messages/:userId
	getThread = async (req, res) => {
		const data = await this.messageService.getThread(
			req.user._id,
			req.params.userId,
			req.query,
		);
		return sendSuccessResponse(res, { ...data });
	};

	// POST /messages/:messageId/read
	markRead = async (req, res) => {
		const data = await this.messageService.markRead(
			req.user._id,
			req.params.messageId,
		);
		return sendSuccessResponse(res, {
			data,
			message: "Message marked as read.",
		});
	};

	// DELETE /messages/:messageId
	deleteMessage = async (req, res) => {
		await this.messageService.deleteMessage(req.user._id, req.params.messageId);
		return sendSuccessResponse(res, { message: "Message deleted." });
	};
}
