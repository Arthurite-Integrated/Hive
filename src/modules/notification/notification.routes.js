import Router from "express";
import { z } from "zod";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import { NotificationController } from "#modules/notification/notification.controller";
import { NotificationType } from "#enums/notification/index";

export const notificationRouter = Router();

const zodEngine = ZodEngine.getInstance();
const controller = NotificationController.getInstance();

// GET /notifications
notificationRouter.get(
	"/notifications",
	authenticate,
	zodEngine.validate.query(
		z.object({
			page: z.coerce.number().int().min(1).default(1),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			isRead: z
				.enum(["true", "false"])
				.optional()
				.transform((v) => (v === undefined ? undefined : v === "true")),
			type: z.enum(Object.values(NotificationType)).optional(),
		}),
	),
	controller.list,
);

// GET /notifications/unread-count  — must come BEFORE /:id routes
notificationRouter.get(
	"/notifications/unread-count",
	authenticate,
	controller.getUnreadCount,
);

// POST /notifications/read-all
notificationRouter.post(
	"/notifications/read-all",
	authenticate,
	controller.markAllRead,
);

// POST /notifications/:id/read
notificationRouter.post(
	"/notifications/:id/read",
	authenticate,
	zodEngine.validate.params(z.object({ id: z.string().min(1) })),
	controller.markRead,
);
