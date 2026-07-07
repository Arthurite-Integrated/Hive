import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { NotificationType } from "#enums/notification/index";

const ChannelsSchema = new Schema(
	{
		inApp: { type: Boolean, default: true },
		email: { type: Boolean, default: false },
		sms: { type: Boolean, default: false },
		whatsapp: { type: Boolean, default: false },
		push: { type: Boolean, default: false },
	},
	{ _id: false },
);

const NotificationSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			required: [true, "User id is required"],
			index: true,
		},
		type: {
			type: String,
			enum: {
				values: Object.values(NotificationType),
				message: "Invalid notification type: {{VALUE}}",
			},
			required: true,
		},

		title: {
			type: String,
			required: [true, "Notification title is required"],
		},
		body: {
			type: String,
			required: [true, "Notification body is required"],
		},
		actionUrl: String,

		resourceType: String,
		resourceId: {
			type: Schema.Types.ObjectId,
		},

		channels: {
			type: ChannelsSchema,
			default: () => ({ inApp: true }),
		},

		isRead: {
			type: Boolean,
			default: false,
		},
		readAt: Date,
	},
	{ timestamps: true },
);

// Unread notifications with pagination
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = model(
	ModelCollections.NOTIFICATION,
	NotificationSchema,
);
