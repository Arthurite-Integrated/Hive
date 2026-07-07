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

const MessageSchema = new Schema(
	{
		senderId: {
			type: Schema.Types.ObjectId,
			default: null, // null = system-generated
			index: true,
		},
		receiverId: {
			type: Schema.Types.ObjectId,
			required: [true, "Receiver id is required"],
			index: true,
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

		isRead: {
			type: Boolean,
			default: false,
		},
		readAt: Date,
		deletedBySender: {
			type: Boolean,
			default: false,
		},
		deletedByReceiver: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true },
);

// Inbox queries
MessageSchema.index({ receiverId: 1, createdAt: -1 });
// Conversation thread queries
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

export const Message = model(ModelCollections.MESSAGE, MessageSchema);
