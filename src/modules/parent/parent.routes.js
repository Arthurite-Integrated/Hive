import Router from "express";
import { JwtService } from "#services/jwt.service";
import { ZodEngine } from "#validator/engine/zod.engine";
import { changePasswordSchema } from "#validator/user/change-password.schema";
import { updateProfileSchema } from "#validator/user/update-profile.schema";
import { ParentController } from "./parent.controller.js";

export const parentRouter = Router();
const jwtService = JwtService.getInstance();
const zodEngine = ZodEngine.getInstance();

const controller = ParentController.getInstance();

parentRouter.use(jwtService.validateToken);

parentRouter.get("/me", controller.getProfile);
parentRouter.patch(
	"/me",
	zodEngine.validate.body(updateProfileSchema),
	controller.update,
);
parentRouter.patch(
	"/me/password",
	zodEngine.validate.body(changePasswordSchema),
	controller.updatePassword,
);
parentRouter.delete("/me", controller.delete);
parentRouter.post("/me/avatar", controller.updateAvatar);
