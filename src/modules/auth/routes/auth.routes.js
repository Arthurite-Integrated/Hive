import Router from "express";
import { JwtService } from "#services/jwt.service";
import { loginSchema, signupSchema } from "#validator/auth/index";
import { ZodEngine } from "#validator/engine/zod.engine";
import { verifyOTPSchema } from "#validator/verification.schema";
import { AuthController } from "../controllers/auth.controller.js";
import { facebookRouter } from "./oauth/facebook.routes.js";
import { googleRouter } from "./oauth/google.routes.js";
import { extractMetadata } from "#middlewares/extract-metadata";

export const authRouter = Router();
const zodEngine = ZodEngine.getInstance();
const jwtService = JwtService.getInstance();
const authController = AuthController.getInstance();

authRouter.use(extractMetadata);

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

authRouter.post("/refresh", authController.refreshToken);
authRouter.post("/logout", authController.logout);
authRouter.post("/logout-all", authController.logoutAll);

/** @info - MFA */
import { mfaRouter } from "./mfa.routes.js";
authRouter.use("/mfa", mfaRouter);

/** @info - Password Reset */
import { passwordRouter } from "./password.routes.js";
authRouter.use("/", passwordRouter);

/** @info - Social completion */
import { SocialCompleteController } from "../controllers/social-complete.controller.js";
const socialCompleteController = SocialCompleteController.getInstance();
authRouter.post("/complete-social", socialCompleteController.complete);

/** @info - OAuth */
authRouter.use("/google", googleRouter);
authRouter.use("/facebook", facebookRouter);

authRouter.post(
	"/verify",
	jwtService.validateToken,
	zodEngine.validate.body(verifyOTPSchema),
	authController.verifyEmail,
);

authRouter.post(
	"/resend-otp",
	jwtService.validateToken,
	authController.resendOtp,
);
