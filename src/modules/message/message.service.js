import mongoose from "mongoose";
import { Message } from "#models/message.model";
import { CacheService } from "#services/cache.service";
import { WebSocketService } from "#services/websocket.service";
import { getUserModel } from "#utils/user-model-router";
import { UserTypes } from "#enums/user.enums";
import {
	throwBadRequestError,
	throwNotFoundError,
	throwForbiddenError,
} from "#helpers/errors/throw-error";

/** User types that have their own Mongoose model */
const ALL_USER_TYPES = [
	UserTypes.INSTRUCTOR,
	UserTypes.STUDENT,
	UserTypes.PARENT,
];

/** Redis key for a user's unread message count */
const unreadKey = (userId) => `msg:unread:${userId}`;

export class MessageService {
	static instance = null;

	/** @returns {MessageService} */
	static getInstance() {
		if (!MessageService.instance) {
			MessageService.instance = new MessageService();
		}
		return MessageService.instance;
	}

	/** @private */
	constructor() {
		this.cache = CacheService.getInstance();
	}

	// ─── Internal helpers ──────────────────────────────────────────────────────

	/**
	 * Confirm a userId belongs to a real user.
	 * Tries every role model and returns the found user or null.
	 */
	#findUserById = async (userId) => {
		for (const ut of ALL_USER_TYPES) {
			const Model = getUserModel(ut);
			const u = await Model.findById(userId).select("_id userType").lean();
			if (u) return u;
		}
		return null;
	};

	// ─── Public methods ────────────────────────────────────────────────────────

	/**
	 * Send a new message.
	 *
	 * @param {string} senderId
	 * @param {{ receiverId: string, type?: string, content: string, attachments?: object[] }} payload
	 */
	send = async (
		senderId,
		{ receiverId, type = "text", content, attachments },
	) => {
		if (String(senderId) === String(receiverId)) {
			throwBadRequestError("Cannot send a message to yourself.");
		}

		const receiver = await this.#findUserById(receiverId);
		if (!receiver) throwNotFoundError("Recipient not found.");

		const msg = await Message.create({
			senderId,
			receiverId,
			type,
			content,
			attachments,
		});

		// Real-time delivery to recipient
		WebSocketService.getInstance().sendToUser(receiverId, {
			type: "message",
			data: msg,
		});

		// Increment unread counter in Redis
		await this.cache.redis.incr(unreadKey(String(receiverId)));

		return msg;
	};

	/**
	 * List conversations (one entry per unique chat partner, with last message
	 * and unread count).
	 *
	 * @param {string} userId
	 * @param {{ page?: number, limit?: number }} opts
	 */
	getConversations = async (userId, { page = 1, limit = 20 } = {}) => {
		const skip = (page - 1) * limit;
		const userObjectId = new mongoose.Types.ObjectId(userId);

		const conversations = await Message.aggregate([
			// Only messages where this user is a participant and hasn't deleted
			{
				$match: {
					$or: [
						{
							senderId: userObjectId,
							deletedBySender: { $ne: true },
						},
						{
							receiverId: userObjectId,
							deletedByReceiver: { $ne: true },
						},
					],
				},
			},
			{ $sort: { createdAt: -1 } },
			// Group by the OTHER participant
			{
				$group: {
					_id: {
						$cond: [
							{ $eq: ["$senderId", userObjectId] },
							"$receiverId",
							"$senderId",
						],
					},
					lastMessage: { $first: "$$ROOT" },
					unreadCount: {
						$sum: {
							$cond: [
								{
									$and: [
										{ $eq: ["$receiverId", userObjectId] },
										{ $eq: ["$isRead", false] },
									],
								},
								1,
								0,
							],
						},
					},
				},
			},
			{ $sort: { "lastMessage.createdAt": -1 } },
			{ $skip: skip },
			{ $limit: limit },
		]);

		// Populate the other user's basic info from whichever model they belong to
		const enriched = await Promise.all(
			conversations.map(async (conv) => {
				let otherUser = null;
				for (const ut of ALL_USER_TYPES) {
					const Model = getUserModel(ut);
					const u = await Model.findById(conv._id)
						.select("firstName lastName avatar avatarUrl userType")
						.lean();
					if (u) {
						otherUser = u;
						break;
					}
				}
				return { ...conv, otherUser };
			}),
		);

		return { data: enriched, page, limit };
	};

	/**
	 * Return messages in a thread between two users (cursor-based, newest first
	 * then reversed for display).
	 *
	 * @param {string} userId
	 * @param {string} otherUserId
	 * @param {{ before?: string, limit?: number }} opts
	 */
	getThread = async (userId, otherUserId, { before, limit = 30 } = {}) => {
		const filter = {
			$or: [
				{
					senderId: userId,
					receiverId: otherUserId,
					deletedBySender: { $ne: true },
				},
				{
					senderId: otherUserId,
					receiverId: userId,
					deletedByReceiver: { $ne: true },
				},
			],
		};
		if (before) filter.createdAt = { $lt: new Date(before) };

		const messages = await Message.find(filter)
			.sort({ createdAt: -1 })
			.limit(limit)
			.lean();

		return {
			data: messages.reverse(),
			hasMore: messages.length === limit,
		};
	};

	/**
	 * Mark a message as read by the receiver.
	 * @param {string} userId — must be the receiver
	 * @param {string} messageId
	 */
	markRead = async (userId, messageId) => {
		const msg = await Message.findOneAndUpdate(
			{ _id: messageId, receiverId: userId },
			{ isRead: true, readAt: new Date() },
			{ new: true },
		);
		if (!msg) throwNotFoundError("Message not found.");

		// Decrement the Redis unread counter (floor at 0)
		const current = await this.cache.redis.get(unreadKey(String(userId)));
		if (current !== null && parseInt(current, 10) > 0) {
			await this.cache.redis.decr(unreadKey(String(userId)));
		}

		return msg;
	};

	/**
	 * Soft-delete a message for the acting user.
	 * @param {string} userId
	 * @param {string} messageId
	 */
	deleteMessage = async (userId, messageId) => {
		const msg = await Message.findById(messageId);
		if (!msg) throwNotFoundError("Message not found.");

		if (String(msg.senderId) === String(userId)) {
			msg.deletedBySender = true;
		} else if (String(msg.receiverId) === String(userId)) {
			msg.deletedByReceiver = true;
		} else {
			throwForbiddenError("You do not have permission to delete this message.");
		}

		await msg.save();
	};

	/**
	 * Get the unread message count for a user.
	 * Uses Redis as a fast cache, falls back to a DB count on cache miss.
	 * @param {string} userId
	 * @returns {Promise<number>}
	 */
	getUnreadCount = async (userId) => {
		const cached = await this.cache.redis.get(unreadKey(String(userId)));
		if (cached !== null) return parseInt(cached, 10);

		// Cache miss — count from DB and repopulate
		const count = await Message.countDocuments({
			receiverId: userId,
			isRead: false,
			deletedByReceiver: { $ne: true },
		});

		await this.cache.redis.set(unreadKey(String(userId)), String(count));
		return count;
	};
}
