import z from "zod";
import { GoogleOAuthAction } from "#enums/auth/index";
import { UserTypes } from "#enums/user.enums";

export const googleAuthenticateSchema = z.object({
	userType: z.enum([UserTypes.INSTRUCTOR, UserTypes.PARENT, UserTypes.STUDENT]),
	action: z.enum([GoogleOAuthAction.LOGIN, GoogleOAuthAction.SIGNUP]),
});

export const googleCallbackSchema = z.object({
	code: z.string(),
	state: z.string(),
});
