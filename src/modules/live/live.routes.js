import Router from "express";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import { z } from "zod";
import { LiveController } from "#modules/live/live.controller";

export const liveRouter = Router();

const zodEngine = ZodEngine.getInstance();
const controller = LiveController.getInstance();

const lessonIdParam = z.object({ lessonId: z.string().min(1) });

// POST /lessons/:lessonId/join-live
liveRouter.post(
	"/lessons/:lessonId/join-live",
	authenticate,
	zodEngine.validate.params(lessonIdParam),
	controller.joinLive,
);

// POST /lessons/:lessonId/leave-live
liveRouter.post(
	"/lessons/:lessonId/leave-live",
	authenticate,
	zodEngine.validate.params(lessonIdParam),
	zodEngine.validate.body(z.object({ attendanceId: z.string().min(1) })),
	controller.leaveLive,
);

// POST /lessons/:lessonId/recording (instructor)
liveRouter.post(
	"/lessons/:lessonId/recording",
	authenticate,
	zodEngine.validate.params(lessonIdParam),
	zodEngine.validate.body(z.object({ key: z.string().min(1) })),
	controller.uploadRecording,
);

// GET /lessons/:lessonId/attendance (instructor)
liveRouter.get(
	"/lessons/:lessonId/attendance",
	authenticate,
	zodEngine.validate.params(lessonIdParam),
	controller.getAttendance,
);
