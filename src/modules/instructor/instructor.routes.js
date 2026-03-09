import Router from "express";
import { JwtService } from "#services/jwt.service";
import { ZodEngine } from "#validator/engine/zod.engine";
import { InstructorController } from "./instructor.controller.js";
import { instructorOnboardSchema } from "./validator/schema.js";

export const instructorRouter = Router();
const jwtService = JwtService.getInstance();
const zodEngine = ZodEngine.getInstance();

const controller = InstructorController.getInstance();

instructorRouter.use(jwtService.validateToken);

instructorRouter.use(
	"/onboard",
	zodEngine.validate.body(instructorOnboardSchema),
	controller.onboard,
);
