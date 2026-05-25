import { Lesson } from "#models/lesson.model";
import { Enrollment } from "#models/enrollment/enrollment.model";
import { LessonProgress } from "#models/enrollment/lesson-progress.model";
import { Course } from "#models/course.model";
import {
	throwForbiddenError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";

/**
 * The Bouncer — validates lesson access before the content handler runs.
 *
 * Sets on req:
 *   req.lesson      — the Lesson document
 *   req.enrollment  — the Enrollment document (unless free preview)
 *   req.course      — the Course document (unless free preview)
 */
export function requireEnrollment() {
	return async (req, _res, next) => {
		const { lessonId } = req.params;

		const lesson = await Lesson.findById(lessonId);
		if (!lesson || lesson.status === "archived") {
			throwNotFoundError("Lesson not found.");
		}

		// Free preview bypasses enrollment check entirely
		if (lesson.isFreePreview) {
			req.lesson = lesson;
			return next();
		}

		const enrollment = await Enrollment.findOne({
			studentId: req.user._id,
			courseId: lesson.courseId,
		});

		if (!enrollment) {
			throwForbiddenError("You are not enrolled in this course.");
		}

		// Status checks
		if (enrollment.status === "cancelled") {
			throwForbiddenError("Your enrollment has been cancelled.");
		}

		if (enrollment.status === "expired") {
			throwForbiddenError(
				"Your enrollment has expired. Please renew to continue.",
			);
		}

		// Expiry date check (subscription expiry)
		if (enrollment.expiresAt && enrollment.expiresAt < new Date()) {
			enrollment.status = "expired";
			await enrollment.save();
			throwForbiddenError(
				"Your enrollment has expired. Please renew to continue.",
			);
		}

		const course = await Course.findById(lesson.courseId);

		// Sequential access check
		if (course?.settings?.sequentialAccess) {
			const prev = await findPreviousLesson(lesson);
			if (prev) {
				const prevProgress = await LessonProgress.findOne({
					studentId: req.user._id,
					lessonId: prev._id,
				});
				if (!prevProgress?.completed) {
					throwForbiddenError("Please complete the previous lesson first.");
				}
			}
		}

		// Drip content check
		if (
			course?.settings?.dripContent &&
			lesson.dripDate &&
			lesson.dripDate > new Date()
		) {
			throwForbiddenError(
				`This lesson is not yet available. It unlocks on ${lesson.dripDate.toISOString()}.`,
			);
		}

		req.enrollment = enrollment;
		req.lesson = lesson;
		req.course = course;
		next();
	};
}

/**
 * Find the lesson immediately before the given one in the same module.
 */
async function findPreviousLesson(lesson) {
	if (lesson.orderIndex === 0) return null;
	return Lesson.findOne({
		moduleId: lesson.moduleId,
		orderIndex: lesson.orderIndex - 1,
		status: "published",
	});
}
