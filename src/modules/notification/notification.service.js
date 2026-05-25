import { Notification } from "#models/notification.model";
import { WebSocketService } from "#services/websocket.service";
import { logger } from "#utils/logger";

export class NotificationService {
	static instance = null;

	/** @returns {NotificationService} */
	static getInstance() {
		if (!NotificationService.instance) {
			NotificationService.instance = new NotificationService();
		}
		return NotificationService.instance;
	}

	/** @private */
	constructor() {}

	/**
	 * Create an in-app notification and push it via WebSocket.
	 * This method swallows all errors so it never crashes the caller.
	 *
	 * @param {{ userId: string, userType?: string, type: string, title: string,
	 *           body: string, actionUrl?: string, resourceType?: string,
	 *           resourceId?: string }} opts
	 * @returns {Promise<import("#models/notification.model").Notification | null>}
	 */
	send = async ({
		userId,
		type,
		title,
		body,
		actionUrl,
		resourceType,
		resourceId,
	}) => {
		try {
			// 1. Persist in-app notification
			const notif = await Notification.create({
				userId,
				type,
				title,
				body,
				actionUrl,
				resourceType,
				resourceId,
				channels: { inApp: true },
				isRead: false,
			});

			// 2. Real-time delivery via WebSocket
			WebSocketService.getInstance().sendToUser(userId, {
				type: "notification",
				data: notif,
			});

			// 3. TODO: email / SMS / push queue jobs (deferred to later phase)

			return notif;
		} catch (err) {
			// Notifications must NEVER crash the caller
			logger.error("NotificationService.send failed", err);
			return null;
		}
	};

	/**
	 * List notifications for a user with pagination.
	 *
	 * @param {string} userId
	 * @param {{ page?: number, limit?: number, isRead?: boolean|string, type?: string }} opts
	 */
	getNotifications = async (
		userId,
		{ page = 1, limit = 20, isRead, type } = {},
	) => {
		const filter = { userId };

		if (isRead !== undefined) {
			filter.isRead = isRead === "true" || isRead === true;
		}
		if (type) filter.type = type;

		const skip = (page - 1) * limit;

		const [data, total] = await Promise.all([
			Notification.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			Notification.countDocuments(filter),
		]);

		return {
			data,
			page,
			limit,
			total,
			hasMore: skip + data.length < total,
		};
	};

	/**
	 * Mark a single notification as read.
	 * @param {string} userId
	 * @param {string} notifId
	 */
	markRead = async (userId, notifId) => {
		return Notification.findOneAndUpdate(
			{ _id: notifId, userId },
			{ isRead: true, readAt: new Date() },
			{ new: true },
		);
	};

	/**
	 * Mark all unread notifications for a user as read.
	 * @param {string} userId
	 */
	markAllRead = async (userId) => {
		await Notification.updateMany(
			{ userId, isRead: false },
			{ $set: { isRead: true, readAt: new Date() } },
		);
	};

	/**
	 * Return the count of unread notifications for a user.
	 * @param {string} userId
	 * @returns {Promise<number>}
	 */
	getUnreadCount = async (userId) => {
		return Notification.countDocuments({ userId, isRead: false });
	};
}
