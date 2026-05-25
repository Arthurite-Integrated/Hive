import {
	throwBadRequestError,
	throwNotFoundError,
	throwForbiddenError,
} from "#helpers/errors/throw-error";
import { Quiz } from "#models/assessment/quiz.model";
import { QuizAttempt } from "#models/assessment/quiz-attempt.model";
import { Lesson } from "#models/lesson.model";
import { Course } from "#models/course.model";
import { LessonProgress } from "#models/enrollment/lesson-progress.model";
import { Enrollment } from "#models/enrollment/enrollment.model";

export class QuizService {
	static instance = null;

	/** @returns {QuizService} */
	static getInstance() {
		if (!QuizService.instance) {
			QuizService.instance = new QuizService();
		}
		return QuizService.instance;
	}

	/** @private */
	constructor() {}

	/**
	 * Instructor creates a quiz for a lesson of type "quiz".
	 */
	createQuiz = async (lessonId, instructorId, payload) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			type: "quiz",
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Quiz lesson not found.");

		const course = await Course.findById(lesson.courseId);
		if (!course || String(course.instructorId) !== String(instructorId)) {
			throwForbiddenError(
				"You do not have permission to create a quiz for this lesson.",
			);
		}

		const existing = await Quiz.findOne({ lessonId });
		if (existing)
			throwBadRequestError("A quiz already exists for this lesson.");

		const quiz = await Quiz.create({ lessonId, ...payload });
		return quiz;
	};

	/**
	 * Get quiz by ID.
	 * Instructor (course owner) gets full quiz with answers.
	 * Students get a sanitized view (no isCorrect / explanation).
	 */
	getQuiz = async (quizId, userId, _userType) => {
		const quiz = await Quiz.findById(quizId);
		if (!quiz) throwNotFoundError("Quiz not found.");

		const lesson = await Lesson.findById(quiz.lessonId);
		const course = await Course.findById(lesson?.courseId);

		// If instructor/owner, return full quiz
		if (course && String(course.instructorId) === String(userId)) {
			return quiz.toObject();
		}

		// Student view — strip isCorrect and explanation
		const sanitized = quiz.toObject();
		sanitized.questions = sanitized.questions.map((q) => ({
			_id: q._id,
			type: q.type,
			questionText: q.questionText,
			orderIndex: q.orderIndex,
			points: q.points,
			options: q.options?.map((o) => ({ _id: o._id, text: o.text })),
		}));
		return sanitized;
	};

	/**
	 * Instructor updates a quiz.
	 */
	updateQuiz = async (quizId, instructorId, payload) => {
		const quiz = await Quiz.findById(quizId);
		if (!quiz) throwNotFoundError("Quiz not found.");

		const lesson = await Lesson.findById(quiz.lessonId);
		const course = await Course.findById(lesson?.courseId);
		if (!course || String(course.instructorId) !== String(instructorId)) {
			throwForbiddenError("You do not have permission to modify this quiz.");
		}

		Object.assign(quiz, payload);
		await quiz.save();
		return quiz;
	};

	/**
	 * Student starts a quiz attempt.
	 * Validates attempt limit, creates attempt record, returns sanitized questions.
	 */
	startAttempt = async (quizId, studentId) => {
		const quiz = await Quiz.findById(quizId);
		if (!quiz) throwNotFoundError("Quiz not found.");

		// Check attempts limit
		const attemptCount = await QuizAttempt.countDocuments({
			quizId,
			studentId,
		});
		if (attemptCount >= quiz.attemptsAllowed) {
			throwBadRequestError(
				`Maximum attempts (${quiz.attemptsAllowed}) reached.`,
			);
		}

		const attempt = await QuizAttempt.create({
			quizId,
			studentId,
			startedAt: new Date(),
			totalPoints: quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0),
		});

		// Prepare questions (optionally randomized), strip answers
		let questions = quiz.questions.map((q) => ({
			_id: q._id,
			type: q.type,
			questionText: q.questionText,
			points: q.points,
			options: q.options?.map((o) => ({ _id: o._id, text: o.text })),
		}));

		if (quiz.randomizeQuestions) {
			questions = questions.sort(() => Math.random() - 0.5);
		}

		const deadline = quiz.timeLimit
			? new Date(attempt.startedAt.getTime() + quiz.timeLimit * 60 * 1000)
			: null;

		return { attempt, questions, deadline };
	};

	/**
	 * Student submits a quiz attempt — auto-grades, updates progress if passed.
	 */
	submitAttempt = async (quizId, studentId, { attemptId, answers }) => {
		const quiz = await Quiz.findById(quizId);
		if (!quiz) throwNotFoundError("Quiz not found.");

		const attempt = await QuizAttempt.findOne({
			_id: attemptId,
			quizId,
			studentId,
		});
		if (!attempt) throwNotFoundError("Attempt not found.");
		if (attempt.submittedAt)
			throwBadRequestError("This attempt has already been submitted.");

		// Grade each answer
		let earnedPoints = 0;
		const gradedAnswers = [];

		for (const ans of answers) {
			const question = quiz.questions.id(ans.questionId);
			if (!question) continue;

			let isCorrect = false;

			if (
				question.type === "multiple_choice" ||
				question.type === "true_false"
			) {
				// ans.answer is the option _id string
				const correctOption = question.options.find((o) => o.isCorrect);
				isCorrect =
					correctOption && String(correctOption._id) === String(ans.answer);
			} else if (question.type === "fill_blank") {
				// Case-insensitive comparison against the first option text
				const correctAnswer = question.options?.[0]?.text || "";
				isCorrect =
					correctAnswer.trim().toLowerCase() ===
					String(ans.answer || "")
						.trim()
						.toLowerCase();
			}

			if (isCorrect) earnedPoints += question.points || 1;

			gradedAnswers.push({
				questionId: ans.questionId,
				answer: ans.answer,
				isCorrect,
			});
		}

		const totalPoints = quiz.questions.reduce(
			(sum, q) => sum + (q.points || 1),
			0,
		);
		const score =
			totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
		const passed = score >= quiz.passScore;

		attempt.answers = gradedAnswers;
		attempt.earnedPoints = earnedPoints;
		attempt.totalPoints = totalPoints;
		attempt.score = score;
		attempt.passed = passed;
		attempt.submittedAt = new Date();
		attempt.timeSpent = Math.round(
			(attempt.submittedAt - attempt.startedAt) / 1000,
		);
		await attempt.save();

		// If passed, mark lesson progress complete and recalculate enrollment progress
		if (passed) {
			const lesson = await Lesson.findById(quiz.lessonId);
			if (lesson) {
				await LessonProgress.findOneAndUpdate(
					{ studentId, lessonId: quiz.lessonId, courseId: lesson.courseId },
					{ $set: { completed: true, completedAt: new Date(), progress: 100 } },
					{ upsert: true },
				);

				// Recalculate enrollment progress percentage
				const totalLessons = await Lesson.countDocuments({
					courseId: lesson.courseId,
					status: "published",
				});
				const completedLessons = await LessonProgress.countDocuments({
					studentId,
					courseId: lesson.courseId,
					completed: true,
				});
				const progressPct =
					totalLessons > 0
						? Math.round((completedLessons / totalLessons) * 100)
						: 0;
				await Enrollment.findOneAndUpdate(
					{ studentId, courseId: lesson.courseId },
					{ $set: { progress: progressPct } },
				);
			}
		}

		// Build response — optionally include correct answers
		const result = { attempt: attempt.toObject() };
		if (quiz.showAnswersAfterSubmission) {
			result.correctAnswers = quiz.questions.map((q) => ({
				questionId: q._id,
				correctOptionId: q.options?.find((o) => o.isCorrect)?._id,
				explanation: q.explanation,
			}));
		}

		return result;
	};

	/**
	 * Get attempts for a quiz.
	 * Instructor sees all attempts; student sees only their own.
	 */
	getAttempts = async (quizId, userId, _userType) => {
		const quiz = await Quiz.findById(quizId);
		if (!quiz) throwNotFoundError("Quiz not found.");

		const lesson = await Lesson.findById(quiz.lessonId);
		const course = await Course.findById(lesson?.courseId);

		// Instructor (course owner) — all attempts
		if (course && String(course.instructorId) === String(userId)) {
			return QuizAttempt.find({ quizId }).sort({ submittedAt: -1 }).lean();
		}

		// Student — own attempts only
		return QuizAttempt.find({ quizId, studentId: userId })
			.sort({ submittedAt: -1 })
			.lean();
	};
}
