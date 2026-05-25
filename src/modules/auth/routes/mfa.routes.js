import Router from "express";
import { authenticate } from "#middlewares/authenticate";
import { MfaController } from "#modules/auth/controllers/mfa.controller";

export const mfaRouter = Router();
const mfaController = MfaController.getInstance();

mfaRouter.post("/enable", authenticate, mfaController.enable);
mfaRouter.post("/verify-setup", authenticate, mfaController.verifySetup);
mfaRouter.post("/login", mfaController.login);
mfaRouter.post("/disable", authenticate, mfaController.disable);
