import { ModelCollections } from "#enums/models/index";
import { LINK_STATUS } from "#enums/parent/index";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.PARENT_STUDENT_LINK;

const ParentStudentLinkSchema = new Schema(
	{
		parentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.PARENT,
		},
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
		},
		relationship: {
			type: String,
			enum: ["parent", "guardian", "sponsor", "other"],
			default: "parent",
		},
		canViewProgress: {
			// Permission to view student's learning progress
			type: Boolean,
			default: true,
		},
		canViewMessages: {
			// Permission to view messages between student and instructors
			type: Boolean,
			default: true,
		},
		canManagePayments: {
			// Permission to manage payments for students
			type: Boolean,
			default: true,
		},
		status: {
			type: String,
			enum: {
				values: Object.values(LINK_STATUS),
				message: "Invalid link status: {{VALUE}}",
			},
			default: LINK_STATUS.PENDING,
		},
		approvedByStudent: {
			type: Boolean,
			default: false,
		},
		requestedAt: {
			type: Date,
			default: Date.now,
		},
		approvedAt: {
			type: Date,
		},
	},
	{
		timestamps: true,
		versionKey: false,
	},
);

/** @info - Enforcing compound indexes for faster lookups */
ParentStudentLinkSchema.index({ parentId: 1, studentId: 1 }, { unique: true });
ParentStudentLinkSchema.index({ studentId: 1, status: 1 });
ParentStudentLinkSchema.index({ parentId: 1, status: 1 });

export const ParentStudentLink = model(collectionName, ParentStudentLinkSchema);
