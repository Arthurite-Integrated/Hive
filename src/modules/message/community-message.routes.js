import Router from "express";
import { z } from "zod";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import { CommunityMessageController } from "#modules/message/community-message.controller";

export const communityMessageRouter = Router();

const zodEngine = ZodEngine.getInstance();
const controller = CommunityMessageController.getInstance();

const attachmentSchema = z.object({
	name: z.string(),
	url: z.string(),
	size: z.number().optional(),
	type: z.string().optional(),
});

// POST /communities/:communityId/messages
communityMessageRouter.post(
	"/communities/:communityId/messages",
	authenticate,
	zodEngine.validate.params(z.object({ communityId: z.string().min(1) })),
	zodEngine.validate.body(
		z.object({
			type: z.enum(["text", "image", "file", "system"]).default("text"),
			content: z.string().min(1),
			attachments: z.array(attachmentSchema).optional(),
			mentions: z.array(z.string()).optional(),
		}),
	),
	controller.send,
);

// GET /communities/:communityId/messages
communityMessageRouter.get(
	"/communities/:communityId/messages",
	authenticate,
	zodEngine.validate.params(z.object({ communityId: z.string().min(1) })),
	zodEngine.validate.query(
		z.object({
			before: z.string().optional(),
			limit: z.coerce.number().int().min(1).max(100).default(30),
		}),
	),
	controller.getMessages,
);

// DELETE /community-messages/:messageId
communityMessageRouter.delete(
	"/community-messages/:messageId",
	authenticate,
	zodEngine.validate.params(z.object({ messageId: z.string().min(1) })),
	controller.deleteMessage,
);
