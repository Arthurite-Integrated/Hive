import { CommunityMessage } from "#models/community-message.model";
import { CommunityMember } from "#models/community-member.model";
import { WebSocketService } from "#services/websocket.service";
import { getUserModel } from "#utils/user-model-router";
import {
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";

export class CommunityMessageService {
	static instance = null;

	/** @returns {CommunityMessageService} */
	static getInstance() {
		if (!CommunityMessageService.instance) {
			CommunityMessageService.instance = new CommunityMessageService();
		}
		return CommunityMessageService.instance;
	}

	/** @private */
	constructor() {}

	#assertMember = async (userId, communityId) => {
		const membership = await CommunityMember.findOne({
			communityId,
			userId,
			status: "active",
		}).lean();
		if (!membership) {
			throwForbiddenError("You must be a member to send messages.");
		}
	};

	send = async (
		senderId,
		senderType,
		communityId,
		{ type, content, attachments, mentions },
	) => {
		await this.#assertMember(senderId, communityId);

		const msg = await CommunityMessage.create({
			communityId,
			senderId,
			senderType,
			type,
			content,
			attachments,
			mentions,
		});

		WebSocketService.getInstance().broadcastToCommunity(communityId, msg);

		return msg;
	};

	getMessages = async (userId, communityId, { before, limit = 30 } = {}) => {
		await this.#assertMember(userId, communityId);

		const filter = { communityId, deletedAt: null };
		if (before) filter.createdAt = { $lt: new Date(before) };

		const messages = await CommunityMessage.find(filter)
			.sort({ createdAt: -1 })
			.limit(limit)
			.lean();

		const senderIds = [
			...new Set(messages.map((m) => m.senderId?.toString()).filter(Boolean)),
		];

		const senderMap = {};
		await Promise.all(
			senderIds.map(async (id) => {
				const senderType = messages.find(
					(m) => m.senderId?.toString() === id,
				)?.senderType;
				if (!senderType) return;
				try {
					const Model = getUserModel(senderType);
					const user = await Model.findById(id)
						.select("firstName lastName avatar avatarUrl userType")
						.lean();
					if (user) senderMap[id] = user;
				} catch {
					// unknown senderType — skip
				}
			}),
		);

		const data = messages.reverse().map((m) => ({
			...m,
			sender: m.senderId ? (senderMap[m.senderId.toString()] ?? null) : null,
		}));

		return { data, hasMore: messages.length === limit };
	};

	deleteMessage = async (userId, messageId) => {
		const msg = await CommunityMessage.findById(messageId);
		if (!msg) throwNotFoundError("Message not found.");

		if (String(msg.senderId) !== String(userId)) {
			throwForbiddenError("You do not have permission to delete this message.");
		}

		msg.deletedAt = new Date();
		await msg.save();
	};
}
