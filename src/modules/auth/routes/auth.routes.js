import Router from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { ZodEngine } from "#validator/engine/zod.engine";
import { JwtService } from "#services/jwt.service";
import { verifyOTPSchema } from "#validator/verification.schema";
import { instructorRouter } from "#modules/instructor/routes/instructor.routes";
import { parentRouter } from "#modules/parent/routes/parent.routes";
import { studentRouter } from "#modules/student/routes/student.routes";

export const authRouter = Router();
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();
const jwtService = JwtService.getInstance();

authRouter.use('/instructor', instructorRouter)
authRouter.use('/parent', parentRouter)
authRouter.use('/student', studentRouter)

authRouter.use(jwtService.validateToken)

authRouter.post('/verify',
  zodEngine.validate.body(verifyOTPSchema),
  authController.verifyEmail
)