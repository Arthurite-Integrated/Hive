import Router from "express";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import {
	createModuleSchema,
	updateModuleSchema,
	reorderSchema,
	createLessonSchema,
	updateLessonSchema,
	videoUploadSchema,
	finalizeVideoSchema,
	pdfUploadSchema,
	finalizePdfSchema,
	addAttachmentSchema,
} from "#validator/course/builder.schema";
import { courseIdParamSchema } from "#validator/course/course.schema";
import { BuilderController } from "#modules/course/builder.controller";
import { z } from "zod";

export const builderRouter = Router();

const zodEngine = ZodEngine.getInstance();
const builderController = BuilderController.getInstance();

const moduleIdParamSchema = z.object({ moduleId: z.string().min(1) });
const lessonIdParamSchema = z.object({ lessonId: z.string().min(1) });

// ─── Module Routes ────────────────────────────────────────────────────────────

// POST /courses/:courseId/modules
builderRouter.post(
	"/courses/:courseId/modules",
	authenticate,
	zodEngine.validate.params(courseIdParamSchema),
	zodEngine.validate.body(createModuleSchema),
	builderController.createModule,
);

// GET /courses/:courseId/modules (curriculum)
builderRouter.get(
	"/courses/:courseId/modules",
	authenticate,
	zodEngine.validate.params(courseIdParamSchema),
	builderController.getCurriculum,
);

// PATCH /courses/:courseId/modules/reorder
builderRouter.patch(
	"/courses/:courseId/modules/reorder",
	authenticate,
	zodEngine.validate.params(courseIdParamSchema),
	zodEngine.validate.body(reorderSchema),
	builderController.reorderModules,
);

// PATCH /modules/:moduleId
builderRouter.patch(
	"/modules/:moduleId",
	authenticate,
	zodEngine.validate.params(moduleIdParamSchema),
	zodEngine.validate.body(updateModuleSchema),
	builderController.updateModule,
);

// DELETE /modules/:moduleId
builderRouter.delete(
	"/modules/:moduleId",
	authenticate,
	zodEngine.validate.params(moduleIdParamSchema),
	builderController.deleteModule,
);

// ─── Lesson Routes ────────────────────────────────────────────────────────────

// POST /modules/:moduleId/lessons
builderRouter.post(
	"/modules/:moduleId/lessons",
	authenticate,
	zodEngine.validate.params(moduleIdParamSchema),
	zodEngine.validate.body(createLessonSchema),
	builderController.createLesson,
);

// PATCH /lessons/:lessonId
builderRouter.patch(
	"/lessons/:lessonId",
	authenticate,
	zodEngine.validate.params(lessonIdParamSchema),
	zodEngine.validate.body(updateLessonSchema),
	builderController.updateLesson,
);

// DELETE /lessons/:lessonId
builderRouter.delete(
	"/lessons/:lessonId",
	authenticate,
	zodEngine.validate.params(lessonIdParamSchema),
	builderController.deleteLesson,
);

// ─── Upload Routes ────────────────────────────────────────────────────────────

// POST /lessons/:lessonId/upload-video
builderRouter.post(
	"/lessons/:lessonId/upload-video",
	authenticate,
	zodEngine.validate.params(lessonIdParamSchema),
	zodEngine.validate.body(videoUploadSchema),
	builderController.getVideoUploadUrl,
);

// POST /lessons/:lessonId/finalize-video
builderRouter.post(
	"/lessons/:lessonId/finalize-video",
	authenticate,
	zodEngine.validate.params(lessonIdParamSchema),
	zodEngine.validate.body(finalizeVideoSchema),
	builderController.finalizeVideo,
);

// POST /lessons/:lessonId/upload-pdf
builderRouter.post(
	"/lessons/:lessonId/upload-pdf",
	authenticate,
	zodEngine.validate.params(lessonIdParamSchema),
	zodEngine.validate.body(pdfUploadSchema),
	builderController.getPdfUploadUrl,
);

// POST /lessons/:lessonId/finalize-pdf
builderRouter.post(
	"/lessons/:lessonId/finalize-pdf",
	authenticate,
	zodEngine.validate.params(lessonIdParamSchema),
	zodEngine.validate.body(finalizePdfSchema),
	builderController.finalizePdf,
);

// POST /lessons/:lessonId/attachments
builderRouter.post(
	"/lessons/:lessonId/attachments",
	authenticate,
	zodEngine.validate.params(lessonIdParamSchema),
	zodEngine.validate.body(addAttachmentSchema),
	builderController.addAttachment,
);
