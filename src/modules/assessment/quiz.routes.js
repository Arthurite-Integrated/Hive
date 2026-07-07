import Router from "express";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import z from "zod";
import { QuizController } from "#modules/assessment/quiz.controller";

export const quizRouter = Router();

const zodEngine = ZodEngine.getInstance();
const controller = QuizController.getInstance();

// — Param schemas —

const lessonIdParam = z.object({
	lessonId: z.string().min(1, "lessonId is required"),
});

const quizIdParam = z.object({
	quizId: z.string().min(1, "quizId is required"),
});

// — Body schemas —

const createQuizBody = z.object({
	title: z.string().min(1).max(200),
	passScore: z.number().min(0).max(100).default(70),
	timeLimit: z.number().positive().optional(),
	attemptsAllowed: z.number().int().min(1).default(1),
	randomizeQuestions: z.boolean().default(false),
	showAnswersAfterSubmission: z.boolean().default(false),
	questions: z
		.array(
			z.object({
				type: z.enum(["multiple_choice", "true_false", "fill_blank"]),
				questionText: z.string().min(1),
				orderIndex: z.number().int().min(0).default(0),
				points: z.number().min(0).default(1),
				options: z
					.array(
						z.object({
							text: z.string().min(1),
							isCorrect: z.boolean().default(false),
						}),
					)
					.optional(),
				explanation: z.string().optional(),
			}),
		)
		.min(1),
});

const updateQuizBody = createQuizBody.partial();

const submitBody = z.object({
	attemptId: z.string().min(1, "attemptId is required"),
	answers: z.array(
		z.object({
			questionId: z.string().min(1),
			answer: z.union([z.string(), z.array(z.string())]),
		}),
	),
});

// — Routes —

// POST /lessons/:lessonId/quiz — instructor creates quiz
quizRouter.post(
	"/lessons/:lessonId/quiz",
	authenticate,
	zodEngine.validate.params(lessonIdParam),
	zodEngine.validate.body(createQuizBody),
	controller.createQuiz,
);

// GET /quizzes/:quizId
quizRouter.get(
	"/quizzes/:quizId",
	authenticate,
	zodEngine.validate.params(quizIdParam),
	controller.getQuiz,
);

// PATCH /quizzes/:quizId — instructor updates quiz
quizRouter.patch(
	"/quizzes/:quizId",
	authenticate,
	zodEngine.validate.params(quizIdParam),
	zodEngine.validate.body(updateQuizBody),
	controller.updateQuiz,
);

// POST /quizzes/:quizId/start — student starts attempt
quizRouter.post(
	"/quizzes/:quizId/start",
	authenticate,
	zodEngine.validate.params(quizIdParam),
	controller.startAttempt,
);

// POST /quizzes/:quizId/submit — student submits attempt
quizRouter.post(
	"/quizzes/:quizId/submit",
	authenticate,
	zodEngine.validate.params(quizIdParam),
	zodEngine.validate.body(submitBody),
	controller.submitAttempt,
);

// GET /quizzes/:quizId/attempts
quizRouter.get(
	"/quizzes/:quizId/attempts",
	authenticate,
	zodEngine.validate.params(quizIdParam),
	controller.getAttempts,
);
