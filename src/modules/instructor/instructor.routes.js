import Router from "express";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import { changePasswordSchema } from "#validator/user/change-password.schema";
import { updateProfileSchema } from "#validator/user/update-profile.schema";
import { onboardSchema } from "#validator/user/onboard.schema";
import { InstructorController } from "./instructor.controller.js";

export const instructorRouter = Router();
const zodEngine = ZodEngine.getInstance();

const controller = InstructorController.getInstance();

instructorRouter.use(authenticate);

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
instructorRouter.post("/me/profile-photo", controller.updateAvatar);

instructorRouter.patch(
	"/me/onboard",
	zodEngine.validate.body(onboardSchema),
	controller.onboard,
);
