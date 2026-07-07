import Router from "express";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import { z } from "zod";
import { AssignmentController } from "#modules/assessment/assignment.controller";

export const assignmentRouter = Router();

const zodEngine = ZodEngine.getInstance();
const controller = AssignmentController.getInstance();

// ─── Param Schemas ───────────────────────────────────────────────────────────

const lessonIdParam = z.object({ lessonId: z.string().min(1) });
const assignmentIdParam = z.object({ assignmentId: z.string().min(1) });
const submissionIdParam = z.object({ submissionId: z.string().min(1) });

// ─── Body / Query Schemas ────────────────────────────────────────────────────

const createAssignmentBody = z.object({
	title: z.string().min(1).max(200),
	instructions: z.string().optional(),
	dueDate: z.string().optional(),
	maxScore: z.number().min(1).default(100),
	submissionType: z.enum(["file", "text", "both"]).default("file"),
	allowedFileTypes: z.array(z.string()).optional(),
	maxFileSize: z.number().positive().optional(),
	rubric: z.string().optional(),
});

const uploadUrlBody = z.object({
	fileName: z.string().min(1),
	contentType: z.string().min(1),
	size: z.number().positive(),
});

const submitBody = z.object({
	textContent: z.string().optional(),
	fileSubmissions: z
		.array(
			z.object({
				name: z.string().min(1),
				url: z.string().min(1),
				size: z.number().optional(),
				type: z.string().optional(),
			}),
		)
		.optional(),
});

const gradeBody = z.object({
	score: z.number().min(0),
	feedback: z.string().optional(),
});

const returnBody = z.object({
	feedback: z.string().min(1),
});

const submissionsQuery = z.object({
	page: z.string().optional(),
	limit: z.string().optional(),
	status: z.enum(["pending", "submitted", "graded", "returned"]).optional(),
});

// ─── Instructor: Create Assignment ───────────────────────────────────────────

// POST /lessons/:lessonId/assignment
assignmentRouter.post(
	"/lessons/:lessonId/assignment",
	authenticate,
	zodEngine.validate.params(lessonIdParam),
	zodEngine.validate.body(createAssignmentBody),
	controller.createAssignment,
);

// ─── Anyone Authenticated: Get Assignment ────────────────────────────────────

// GET /assignments/:assignmentId
assignmentRouter.get(
	"/assignments/:assignmentId",
	authenticate,
	zodEngine.validate.params(assignmentIdParam),
	controller.getAssignment,
);

// ─── Student: Upload URL + Submit ────────────────────────────────────────────

// POST /assignments/:assignmentId/upload-url
assignmentRouter.post(
	"/assignments/:assignmentId/upload-url",
	authenticate,
	zodEngine.validate.params(assignmentIdParam),
	zodEngine.validate.body(uploadUrlBody),
	controller.getUploadUrl,
);

// POST /assignments/:assignmentId/submit
assignmentRouter.post(
	"/assignments/:assignmentId/submit",
	authenticate,
	zodEngine.validate.params(assignmentIdParam),
	zodEngine.validate.body(submitBody),
	controller.submitAssignment,
);

// ─── Instructor: View Submissions ────────────────────────────────────────────

// GET /assignments/:assignmentId/submissions
assignmentRouter.get(
	"/assignments/:assignmentId/submissions",
	authenticate,
	zodEngine.validate.params(assignmentIdParam),
	zodEngine.validate.query(submissionsQuery),
	controller.getSubmissions,
);

// ─── Instructor: Grade / Return ──────────────────────────────────────────────

// PATCH /submissions/:submissionId/grade
assignmentRouter.patch(
	"/submissions/:submissionId/grade",
	authenticate,
	zodEngine.validate.params(submissionIdParam),
	zodEngine.validate.body(gradeBody),
	controller.gradeSubmission,
);

// POST /submissions/:submissionId/return
assignmentRouter.post(
	"/submissions/:submissionId/return",
	authenticate,
	zodEngine.validate.params(submissionIdParam),
	zodEngine.validate.body(returnBody),
	controller.returnSubmission,
);
