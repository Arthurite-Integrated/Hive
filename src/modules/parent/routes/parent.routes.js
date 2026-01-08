import Router from "express";
import { AuthController } from "#modules/auth/controllers/auth.controller";
import { JwtService } from "#services/jwt.service";
import { loginSchema, signupSchema } from "#validator/auth/index";
import { ZodEngine } from "#validator/engine/zod.engine";

export const parentRouter = Router();
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();
const jwtService = JwtService.getInstance();

parentRouter.post(
	"/",
	zodEngine.validate.body(signupSchema),
	authController.registerParent,
);

parentRouter.post(
	"/login",
	zodEngine.validate.body(loginSchema),
	authController.loginParent,
);

parentRouter.use(jwtService.validateToken);
