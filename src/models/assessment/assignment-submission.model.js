import { AssignmentSubmissionStatus } from "#enums/assessment/assignment.enums";
import { ModelCollections } from "#enums/models/index";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.ASSIGNMENT_SUBMISSION;

const FileSubmissionSchema = new Schema(
	{
		name: { type: String, required: true },
		url: { type: String, required: true },
		size: { type: Number },
		type: { type: String },
	},
	{ _id: false },
);

const AssignmentSubmissionSchema = new Schema(
	{
		assignmentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.ASSIGNMENT,
			required: true,
		},
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: true,
		},
		textSubmission: { type: String },
		fileSubmissions: { type: [FileSubmissionSchema], default: [] },
		status: {
			type: String,
			enum: {
				values: Object.values(AssignmentSubmissionStatus),
				message: "Invalid assignment submission status: {{VALUE}}",
			},
			default: AssignmentSubmissionStatus.PENDING,
		},
		score: { type: Number },
		feedback: { type: String },
		gradedBy: { type: Schema.Types.ObjectId, ref: ModelCollections.INSTRUCTOR },
		gradedAt: { type: Date },
		submittedAt: { type: Date },
	},
	{ timestamps: true },
);

AssignmentSubmissionSchema.pre("save", function (next) {
	if (this.isModified("status")) {
		if (
			this.status === AssignmentSubmissionStatus.SUBMITTED &&
			!this.submittedAt
		) {
			this.submittedAt = new Date();
		}
		if (this.status === AssignmentSubmissionStatus.GRADED && !this.gradedAt) {
			this.gradedAt = new Date();
		}
		if (this.status === AssignmentSubmissionStatus.RETURNED) {
			/** Requesting for resubmission */
		}
	}
	next();
});

export const AssignmentSubmission = model(
	collectionName,
	AssignmentSubmissionSchema,
);
