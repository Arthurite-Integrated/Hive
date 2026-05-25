import Router from "express";
import { z } from "zod";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import { MessageController } from "#modules/message/message.controller";

export const messageRouter = Router();

const zodEngine = ZodEngine.getInstance();
const controller = MessageController.getInstance();

// POST /messages — send a new message
messageRouter.post(
	"/messages",
	authenticate,
	zodEngine.validate.body(
		z.object({
			receiverId: z.string().min(1),
			type: z.enum(["text", "image", "file"]).default("text"),
			content: z.string().min(1),
			attachments: z
				.array(
					z.object({
						name: z.string(),
						url: z.string(),
						size: z.number().optional(),
						type: z.string().optional(),
					}),
				)
				.optional(),
		}),
	),
	controller.send,
);

// GET /messages/conversations — list all conversations (must come before /:userId)
messageRouter.get(
	"/messages/conversations",
	authenticate,
	zodEngine.validate.query(
		z.object({
			page: z.coerce.number().int().min(1).default(1),
			limit: z.coerce.number().int().min(1).max(100).default(20),
		}),
	),
	controller.getConversations,
);

// GET /messages/unread-count — must come before /:userId
messageRouter.get(
	"/messages/unread-count",
	authenticate,
	controller.getUnreadCount,
);

// GET /messages/:userId — fetch message thread
messageRouter.get(
	"/messages/:userId",
	authenticate,
	zodEngine.validate.params(z.object({ userId: z.string().min(1) })),
	zodEngine.validate.query(
		z.object({
			before: z.string().optional(),
			limit: z.coerce.number().int().min(1).max(100).default(30),
		}),
	),
	controller.getThread,
);

// POST /messages/:messageId/read
messageRouter.post(
	"/messages/:messageId/read",
	authenticate,
	zodEngine.validate.params(z.object({ messageId: z.string().min(1) })),
	controller.markRead,
);

// DELETE /messages/:messageId
messageRouter.delete(
	"/messages/:messageId",
	authenticate,
	zodEngine.validate.params(z.object({ messageId: z.string().min(1) })),
	controller.deleteMessage,
);
