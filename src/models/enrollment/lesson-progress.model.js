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
		courseId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COURSE,
			required: true,
		},
		enrollmentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.ENROLLMENT,
		},
		completed: {
			type: Boolean,
			default: false,
		},
		completedAt: Date,
		progress: {
			type: Number,
			default: 0,
			min: 0,
			max: 100,
		},
		watchedSeconds: {
			type: Number,
			default: 0,
		},
		lastPosition: {
			type: Number,
			default: 0,
		},
		lastAccessedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true },
);

LessonProgressSchema.index({ studentId: 1, lessonId: 1 }, { unique: true });
LessonProgressSchema.index({ studentId: 1, courseId: 1 });
LessonProgressSchema.index({ courseId: 1, completed: 1 });

export const LessonProgress = model(
	ModelCollections.LESSON_PROGRESS,
	LessonProgressSchema,
);
