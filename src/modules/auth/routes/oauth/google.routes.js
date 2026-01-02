import { AuthController } from "#modules/auth/controllers/auth.controller";
import { googleAuthenticateSchema, googleCallbackSchema } from "#validator/auth/oauth/google.auth.schema";
import { ZodEngine } from "#validator/engine/zod.engine";
import Router from "express";
import { JwtService } from "#services/jwt.service";

export const googleRouter = Router();
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();
const jwtService = JwtService.getInstance();
googleRouter.get('/',
  zodEngine.validate.query(googleAuthenticateSchema),
  authController.googleOAuth
)

googleRouter.get('/login/callback',
  zodEngine.validate.query(googleCallbackSchema),
  authController.loginWithGoogle
)

googleRouter.get('/signup/callback',
  zodEngine.validate.query(googleCallbackSchema),
  authController.signupWithGoogle
)

googleRouter.use(jwtService.validateToken)