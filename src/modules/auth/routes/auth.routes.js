import Router from "express";
import { instructorRouter } from "#modules/instructor/routes/instructor.routes";
import { parentRouter } from "#modules/parent/routes/parent.routes";
import { studentRouter } from "#modules/student/routes/student.routes";
import { JwtService } from "#services/jwt.service";
import { ZodEngine } from "#validator/engine/zod.engine";
import { verifyOTPSchema } from "#validator/verification.schema";
import { AuthController } from "../controllers/auth.controller.js";
import { facebookRouter } from "./oauth/facebook.routes.js";
import { googleRouter } from "./oauth/google.routes.js";

export const authRouter = Router();
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();
const jwtService = JwtService.getInstance();

authRouter.use("/instructor", instructorRouter);
authRouter.use("/parent", parentRouter);
authRouter.use("/student", studentRouter);

/** @info - OAuth */
authRouter.use("/google", googleRouter);
authRouter.use("/facebook", facebookRouter);

authRouter.post(
	"/verify",
	jwtService.validateToken,
	zodEngine.validate.body(verifyOTPSchema),
	authController.verifyEmail,
);
