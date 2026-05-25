import Router from "express";
import { ZodEngine } from "#validator/engine/zod.engine";
import {
	forgotPasswordSchema,
	resetPasswordSchema,
} from "#validator/auth/password.schema";
import { PasswordController } from "#modules/auth/controllers/password.controller";

export const passwordRouter = Router();
const zodEngine = ZodEngine.getInstance();
const passwordController = PasswordController.getInstance();

passwordRouter.post(
	"/forgot-password",
	zodEngine.validate.body(forgotPasswordSchema),
	passwordController.forgotPassword,
);

passwordRouter.post(
	"/reset-password",
	zodEngine.validate.body(resetPasswordSchema),
	passwordController.resetPassword,
);
