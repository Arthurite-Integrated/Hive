import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { AssignmentSubmissionType } from "#enums/assessment/assignment.enums";

const collectionName = ModelCollections.ASSIGNMENT;

const AssignmentSchema = new Schema(
	{
		lessonId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.LESSON,
			required: true,
			unique: true,
		},
		title: { type: String, required: true },
		instructions: { type: String },
		dueDate: { type: Date },
		maxScore: { type: Number, default: 100 },
		submissionType: {
			type: String,
			enum: {
				values: Object.values(AssignmentSubmissionType),
				message: "Invalid assignment submission type: {{VALUE}}",
			},
			default: "file",
		},
		allowedFileTypes: { type: [String], default: undefined },
		maxFileSize: { type: Number },
		rubric: { type: String },
	},
	{ timestamps: true },
);

export const Assignment = model(collectionName, AssignmentSchema);
