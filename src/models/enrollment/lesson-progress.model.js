import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";

const LessonProgressSchema = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: true,
		},
		lessonId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.LESSON,
			required: true,
		},
		enrollmentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.ENROLLMENT,
			required: true,
		},
		completed: {
			type: Boolean,
			default: false,
		},
		progress: {
			type: Number,
			default: 0,
		},
		lastPosition: {
			type: Number,
			default: 0,
		},
		completedAt: Date,
		lastAccessedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true },
);

LessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });

export const LessonProgress = model(
	ModelCollections.LESSON_PROGRESS,
	LessonProgressSchema,
);
