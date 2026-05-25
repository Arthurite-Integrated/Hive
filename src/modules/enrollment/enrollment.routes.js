import Router from "express";
import { authenticate } from "#middlewares/authenticate";
import { requireEnrollment } from "#middlewares/require-enrollment";
import { ZodEngine } from "#validator/engine/zod.engine";
import {
	enrollBodySchema,
	enrollParamSchema,
	enrollmentsQuerySchema,
} from "#validator/enrollment/enrollment.schema";
import { EnrollmentController } from "#modules/enrollment/enrollment.controller";

export const enrollmentRouter = Router();

const zodEngine = ZodEngine.getInstance();
const controller = EnrollmentController.getInstance();

// POST /courses/:courseId/enroll
enrollmentRouter.post(
	"/courses/:courseId/enroll",
	authenticate,
	zodEngine.validate.params(enrollParamSchema),
	zodEngine.validate.body(enrollBodySchema),
	controller.enroll,
);

// GET /users/me/enrollments
enrollmentRouter.get(
	"/users/me/enrollments",
	authenticate,
	zodEngine.validate.query(enrollmentsQuerySchema),
	controller.getMyEnrollments,
);

// GET /courses/:courseId/enrollment
enrollmentRouter.get(
	"/courses/:courseId/enrollment",
	authenticate,
	zodEngine.validate.params(enrollParamSchema),
	controller.getEnrollmentForCourse,
);

// GET /courses/:courseId/learning
enrollmentRouter.get(
	"/courses/:courseId/learning",
	authenticate,
	zodEngine.validate.params(enrollParamSchema),
	controller.getCourseData,
);

// GET /lessons/:lessonId/content — gated by The Bouncer
enrollmentRouter.get(
	"/lessons/:lessonId/content",
	authenticate,
	requireEnrollment(),
	controller.getLessonContent,
);

// POST /lessons/:lessonId/progress
enrollmentRouter.post(
	"/lessons/:lessonId/progress",
	authenticate,
	controller.updateLessonProgress,
);

// GET /lessons/:lessonId/progress
enrollmentRouter.get(
	"/lessons/:lessonId/progress",
	authenticate,
	controller.getLessonProgress,
);
