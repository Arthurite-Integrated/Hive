import Router from "express";
import { JwtService } from "#services/jwt.service";
import { ZodEngine } from "#validator/engine/zod.engine";
import { changePasswordSchema } from "#validator/user/change-password.schema";
import { onboardSchema } from "#validator/user/onboard.schema";
import { linkIdParamSchema } from "#validator/user/parent-student-link.schema";
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
studentRouter.patch(
	"/me/password",
	zodEngine.validate.body(changePasswordSchema),
	controller.updatePassword,
);
studentRouter.delete("/me", controller.delete);
studentRouter.post("/me/avatar", controller.updateAvatar);
studentRouter.patch(
	"/me/onboard",
	zodEngine.validate.body(onboardSchema),
	controller.onboard,
);

/** @info - Parent-Student linking */
studentRouter.post(
	"/me/approve-link/:linkId",
	zodEngine.validate.params(linkIdParamSchema),
	controller.approveLink,
);
studentRouter.get("/me/linked-parents", controller.getLinkedParents);
studentRouter.delete(
	"/me/links/:linkId",
	zodEngine.validate.params(linkIdParamSchema),
	controller.revokeLink,
);
