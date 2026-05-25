import { sendSuccessResponse } from "#helpers/responses/index";
import { throwNotFoundError } from "#helpers/errors/throw-error";
import { NotificationService } from "#modules/notification/notification.service";

export class NotificationController {
	static instance = null;

	/** @returns {NotificationController} */
	static getInstance() {
		if (!NotificationController.instance) {
			NotificationController.instance = new NotificationController();
		}
		return NotificationController.instance;
	}

	/** @private */
	constructor() {
		this.notificationService = NotificationService.getInstance();
	}

	// GET /notifications
	list = async (req, res) => {
		const data = await this.notificationService.getNotifications(
			req.user._id,
			req.query,
		);
		return sendSuccessResponse(res, { ...data });
	};

	// POST /notifications/:id/read
	markRead = async (req, res) => {
		const notif = await this.notificationService.markRead(
			req.user._id,
			req.params.id,
		);
		if (!notif) throwNotFoundError("Notification not found.");
		return sendSuccessResponse(res, {
			data: notif,
			message: "Marked as read.",
		});
	};

	// POST /notifications/read-all
	markAllRead = async (req, res) => {
		await this.notificationService.markAllRead(req.user._id);
		return sendSuccessResponse(res, {
			message: "All notifications marked as read.",
		});
	};

	// GET /notifications/unread-count
	getUnreadCount = async (req, res) => {
		const count = await this.notificationService.getUnreadCount(req.user._id);
		return sendSuccessResponse(res, { data: { count } });
	};
}
