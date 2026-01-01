import { AuthController } from "#modules/auth/controllers/auth.controller";
import { JwtService } from "#services/jwt.service";
import { loginSchema, signupSchema } from "#validator/auth/index";
import { ZodEngine } from "#validator/engine/zod.engine";
import Router from "express";

export const instructorRouter = Router()
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();
const jwtService = JwtService.getInstance();

instructorRouter.post('/',
  zodEngine.validate.body(signupSchema), 
  authController.registerInstructor
)

instructorRouter.post('/login',
  zodEngine.validate.body(loginSchema),
  authController.loginInstructor
)

instructorRouter.use(jwtService.validateToken)