import Router from "express";
import { AuthController } from "#modules/auth/controllers/auth.controller";
import {
	googleAuthenticateSchema,
	googleCallbackSchema,
} from "#validator/auth/oauth/google.auth.schema";
import { ZodEngine } from "#validator/engine/zod.engine";

export const googleRouter = Router();
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();

// GET /auth/google — returns the Google OAuth URL
googleRouter.get(
	"/",
	zodEngine.validate.query(googleAuthenticateSchema),
	authController.googleOAuth,
);

// GET /auth/google/callback — unified callback (handles login + signup)
googleRouter.get(
	"/callback",
	zodEngine.validate.query(googleCallbackSchema),
	authController.googleCallback,
);
