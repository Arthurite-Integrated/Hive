import Router from "express";
import { JwtService } from "#services/jwt.service";
import { ZodEngine } from "#validator/engine/zod.engine";
import { updateProfileSchema } from "#validator/user/update-profile.schema";
import { StudentController } from "./student.controller.js";

export const studentRouter = Router();
const jwtService = JwtService.getInstance();
const zodEngine = ZodEngine.getInstance();

const controller = StudentController.getInstance();

studentRouter.use(jwtService.validateToken);

studentRouter.get("/me", controller.getProfile);
studentRouter.patch(
	"/me",
	zodEngine.validate.body(updateProfileSchema),
	controller.update,
);
