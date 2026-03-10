import { ModelCollections } from "#enums/models/index";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.QUIZ;

const OptionSchema = new Schema(
	{
		text: { type: String, required: true },
		isCorrect: { type: Boolean, default: false },
	},
	{ _id: true },
);

const QuestionSchema = new Schema(
	{
		type: {
			type: String,
			enum: {},
			required: true,
		},
		questionText: { type: String, required: true },
		orderIndex: { type: Number, default: 0 },
		points: { type: Number, default: 1 },
		options: { type: [OptionSchema], default: undefined },
		explanation: { type: String },
		generatedByAI: { type: Boolean, default: false, select: false },
	},
	{ _id: true },
);

const QuizSchema = new Schema(
	{
		lessonId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.LESSON,
			required: true,
			unique: true,
		},
		title: {
			type: String,
			required: true,
		},
		passScore: { type: Number, default: 70 },
		timeLimit: { type: Number }, // minutes
		attemptsAllowed: { type: Number, default: 1 },
		randomizeQuestions: { type: Boolean, default: false },
		showAnswersAfterSubmission: { type: Boolean, default: false },
		questions: { type: [QuestionSchema], default: [] },
	},
	{ timestamps: true },
);

export const Quiz = model(collectionName, QuizSchema);
