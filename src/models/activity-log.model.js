import { model, Schema } from "mongoose";
import {
	ACTIVITY_RESOURCE_TYPE,
	FLAT_ACTIVITY_ACTIONS,
} from "#enums/activity-log/index";
import { ModelCollections } from "#enums/models/index";

const collectionName = ModelCollections.ACTIVITY_LOG;

const ActivityLogSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			required: [true, "User ID is required"],
			refPath: "userType",
		},
		userType: {
			type: String,
			required: [true, "User type is required"],
			enum: {
				values: [
					ModelCollections.INSTRUCTOR,
					ModelCollections.STUDENT,
					ModelCollections.PARENT,
				],
				message: "Invalid user type: {{VALUE}}",
			},
		},
		activity: {
			type: String,
			required: [true, "Activity is required"],
			enum: {
				values: FLAT_ACTIVITY_ACTIONS,
				message: "Invalid activity: {{VALUE}}",
			},
		},
		resourceType: {
			type: String,
			required: [true, "Resource type is required"],
			enum: {
				values: Object.values(ACTIVITY_RESOURCE_TYPE),
				message: "Invalid resource type: {{VALUE}}",
			},
		},
		metadata: {
			type: Schema.Types.Mixed,
			required: false,
		},
		ipAddress: String,
		userAgent: String,
	},
	{
		timestamps: true,
		versionKey: false,
		virtuals: true,
	},
);

// Per-user activity lookup
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
// Filter by action type
ActivityLogSchema.index({ activity: 1, createdAt: -1 });
// TTL: auto-delete after 90 days
ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const ActivityLog = model(collectionName, ActivityLogSchema);
