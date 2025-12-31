import Router from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { createInstructorSchema } from "#validator/instructor/create.schema";
import { ZodEngine } from "#validator/engine/zod.engine";
import { JwtService } from "#services/jwt.service";
import { verifyOTPSchema } from "#validator/verification.schema";

export const authRouter = Router();
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();
const jwtService = JwtService.getInstance();

authRouter.post('/instructor',
  zodEngine.validate.body(createInstructorSchema), 
  authController.registerInstructor
)

authRouter.use(jwtService.validateToken)

authRouter.post('/verify-email',
  zodEngine.validate.body(verifyOTPSchema),
  authController.verifyEmail
)