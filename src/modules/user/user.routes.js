import Router from "express";
import { z } from "zod";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import { onboardSchema } from "#validator/user/onboard.schema";
import { updateUserSchema } from "#validator/user/update-user.schema";
import { UserController } from "./user.controller.js";

export const userRouter = Router();

const zodEngine = ZodEngine.getInstance();
const controller = UserController.getInstance();

// All /users/me routes require authentication
userRouter.use(authenticate);

// GET /users/me — return the user already loaded by authenticate (no extra DB hit)
userRouter.get("/me", controller.getProfile);

// PATCH /users/me — update profile fields (role-aware)
userRouter.patch(
	"/me",
	zodEngine.validate.body(updateUserSchema),
	controller.update,
);

// PATCH /users/me/onboard — unified onboard endpoint (role-aware field filtering)
userRouter.patch(
	"/me/onboard",
	zodEngine.validate.body(onboardSchema),
	controller.onboard,
);

// GET /users/me/streak — learning streak for the current user
userRouter.get("/me/streak", controller.getStreak);

// GET /users/me/avatar/upload-url?contentType=image/jpeg — get presigned S3 URL
userRouter.get("/me/avatar/upload-url", controller.getAvatarUploadUrl);

// POST /users/me/avatar — finalize avatar after S3 upload
userRouter.post("/me/avatar", controller.finalizeAvatar);

// DELETE /users/me — soft delete account + invalidate all tokens
userRouter.delete("/me", controller.delete);

// GET /users/search?q=&limit= — find users to DM
userRouter.get(
	"/search",
	zodEngine.validate.query(
		z.object({
			q: z.string().min(2, "Query must be at least 2 characters").default(""),
			limit: z.coerce.number().int().min(1).max(30).default(10),
		}),
	),
	controller.search,
);
