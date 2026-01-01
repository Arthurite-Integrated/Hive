import { ACTIVITY_RESOURCE_TYPE, FLAT_ACTIVITY_ACTIONS } from "#enums/activity-log/index";
import { ModelCollections } from "#enums/models/index";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.ACTIVITY_LOG;

const ActivityLogSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    required: [true, "User ID is required"],
    refPath: "userType",
  },
  userType: {
    type: String,
    required: [true, "User type is required"],
    enum: {
      values: [ModelCollections.INSTRUCTOR, ModelCollections.STUDENT, ModelCollections.PARENT],
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
  }
}, {
  timestamps: true,
  versionKey: false,
  virtuals: true,
});

export const ActivityLog = model(collectionName, ActivityLogSchema);