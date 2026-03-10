import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { ReviewStatus } from "#enums/review/index";

const InstructorReplySchema = new Schema(
	{
		content: { type: String, required: true },
		repliedAt: { type: Date, default: Date.now },
	},
	{ _id: false },
);

const ReviewSchema = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: [true, "Student id is required"],
			index: true,
		},
		courseId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COURSE,
			required: [true, "Course id is required"],
			index: true,
		},
		enrollmentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.ENROLLMENT,
			required: [true, "Enrollment id is required"],
		},

		rating: {
			type: Number,
			required: [true, "Rating is required"],
			min: 1,
			max: 5,
		},
		title: String,
		comment: String,

		isEdited: {
			type: Boolean,
			default: false,
		},
		editedAt: Date,

		status: {
			type: String,
			enum: {
				values: Object.values(ReviewStatus),
				message: "Invalid review status: {{VALUE}}",
			},
			default: ReviewStatus.VISIBLE,
		},
		flagReason: String,

		helpfulCount: {
			type: Number,
			default: 0,
			min: 0,
		},

		instructorReply: {
			type: InstructorReplySchema,
			default: undefined,
		},
	},
	{ timestamps: true },
);

// One review per student per course
ReviewSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export const Review = model(ModelCollections.REVIEW, ReviewSchema);
