import Router from "express";
import { JwtService } from "#services/jwt.service";
import { loginSchema, signupSchema } from "#validator/auth/index";
import { ZodEngine } from "#validator/engine/zod.engine";
import { verifyOTPSchema } from "#validator/verification.schema";
import { AuthController } from "../controllers/auth.controller.js";
import { facebookRouter } from "./oauth/facebook.routes.js";
import { googleRouter } from "./oauth/google.routes.js";

export const authRouter = Router();
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();
const jwtService = JwtService.getInstance();

authRouter.post(
	"/register",
	zodEngine.validate.body(signupSchema),
	authController.register,
);
authRouter.post(
	"/login",
	zodEngine.validate.body(loginSchema),
	authController.login,
);

/** @info - OAuth */
authRouter.use("/google", googleRouter);
authRouter.use("/facebook", facebookRouter);

authRouter.post(
	"/verify",
	jwtService.validateToken,
	zodEngine.validate.body(verifyOTPSchema),
	authController.verifyEmail,
);
