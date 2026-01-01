import { AuthController } from "#modules/auth/controllers/auth.controller";
import { JwtService } from "#services/jwt.service";
import { loginSchema, signupSchema } from "#validator/auth/index";
import { ZodEngine } from "#validator/engine/zod.engine";
import Router from "express";

export const studentRouter = Router()
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();
const jwtService = JwtService.getInstance();

studentRouter.post('/',
  zodEngine.validate.body(signupSchema), 
  authController.registerStudent
)

studentRouter.post('/login',
  zodEngine.validate.body(loginSchema),
  authController.loginStudent
)

studentRouter.use(jwtService.validateToken)