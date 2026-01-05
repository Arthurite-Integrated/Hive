import { AuthController } from "#modules/auth/controllers/auth.controller";
import { facebookAuthenticateSchema, facebookCallbackSchema } from "#validator/auth/oauth/facebook.auth.schema";
import { ZodEngine } from "#validator/engine/zod.engine";
import Router from "express";

export const facebookRouter = Router();
const authController = AuthController.getInstance();
const zodEngine = ZodEngine.getInstance();

// GET route to initiate Facebook OAuth (returns auth URL)
facebookRouter.get('/',
  zodEngine.validate.query(facebookAuthenticateSchema),
  authController.facebookOAuth
);

// GET routes for Facebook OAuth callbacks (Facebook sends GET requests)
facebookRouter.get('/login/callback',
  zodEngine.validate.query(facebookCallbackSchema),
  authController.loginWithFacebook
);

facebookRouter.get('/signup/callback',
  zodEngine.validate.query(facebookCallbackSchema),
  authController.signupWithFacebook
);
