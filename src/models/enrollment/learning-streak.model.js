import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";

const LearningStreakSchema = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: true,
		},
		currentStreak: {
			type: Number,
			default: 0,
		},
		longestStreak: {
			type: Number,
			default: 0,
		},
		lastActivityDate: {
			type: Date,
			default: null,
		},
		totalActiveDays: {
			type: Number,
			default: 0,
		},
	},
	{ timestamps: true },
);

export const LearningStreak = model(
	ModelCollections.LEARNING_STREAK,
	LearningStreakSchema,
);
