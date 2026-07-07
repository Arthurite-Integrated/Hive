import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { MessageType } from "#enums/community/message.enums";

const AttachmentSchema = new Schema(
	{
		name: { type: String, required: true },
		url: { type: String, required: true },
		size: { type: Number },
		type: { type: String },
	},
	{ _id: false },
);

const CommunityMessageSchema = new Schema(
	{
		communityId: {
			type: Schema.Types.ObjectId,
			required: true,
			index: true,
		},
		senderId: {
			type: Schema.Types.ObjectId,
			default: null,
		},
		senderType: {
			type: String,
		},
		type: {
			type: String,
			enum: {
				values: Object.values(MessageType),
				message: "Invalid message type: {{VALUE}}",
			},
			default: MessageType.TEXT,
		},
		content: {
			type: String,
			required: [true, "Message content is required"],
		},
		attachments: {
			type: [AttachmentSchema],
			default: undefined,
		},
		mentions: {
			type: [Schema.Types.ObjectId],
			default: undefined,
		},
		deletedAt: {
			type: Date,
			default: null,
		},
	},
	{ timestamps: true },
);

CommunityMessageSchema.index({ communityId: 1, createdAt: -1 });
CommunityMessageSchema.index({ communityId: 1, deletedAt: 1 });

export const CommunityMessage = model(
	ModelCollections.COMMUNITY_MESSAGE,
	CommunityMessageSchema,
);
