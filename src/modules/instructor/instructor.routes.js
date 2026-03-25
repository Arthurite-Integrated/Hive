import Router from "express";
import { JwtService } from "#services/jwt.service";
import { ZodEngine } from "#validator/engine/zod.engine";
import { changePasswordSchema } from "#validator/user/change-password.schema";
import { updateProfileSchema } from "#validator/user/update-profile.schema";
import { InstructorController } from "./instructor.controller.js";
import { instructorOnboardSchema } from "./validator/schema.js";

export const instructorRouter = Router();
const jwtService = JwtService.getInstance();
const zodEngine = ZodEngine.getInstance();

const controller = InstructorController.getInstance();

instructorRouter.use(jwtService.validateToken);

instructorRouter.get("/me", controller.getProfile);
instructorRouter.patch(
	"/me",
	zodEngine.validate.body(updateProfileSchema),
	controller.update,
);

instructorRouter.patch(
	"/me/password",
	zodEngine.validate.body(changePasswordSchema),
	controller.updatePassword,
);
instructorRouter.delete("/me", controller.delete);

instructorRouter.use(
	"/onboard",
	zodEngine.validate.body(instructorOnboardSchema),
	controller.onboard,
);
