import { ModelCollections } from "#enums/models/index";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.QUIZ_ATTEMPT;

const AnswerSchema = new Schema(
	{
		questionId: { type: Schema.Types.ObjectId, required: true },
		answer: { type: Schema.Types.Mixed }, // string or array
		isCorrect: { type: Boolean, default: false },
	},
	{ _id: false },
);

const QuizAttemptSchema = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: true,
		},
		quizId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.QUIZ,
			required: true,
		},
		score: { type: Number, default: 0 }, // percentage
		totalPoints: { type: Number, default: 0 },
		earnedPoints: { type: Number, default: 0 },
		passed: { type: Boolean, default: false },
		answers: { type: [AnswerSchema], default: [] },
		timeSpent: { type: Number }, // seconds
		startedAt: { type: Date, required: true },
		submittedAt: { type: Date },
	},
	{ timestamps: true },
);

export const QuizAttempt = model(collectionName, QuizAttemptSchema);
