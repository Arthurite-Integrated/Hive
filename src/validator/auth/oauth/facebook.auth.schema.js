import z from "zod";
import { FacebookOAuthAction } from "#enums/auth/index";
import { UserTypes } from "#enums/user.enums";

export const facebookAuthenticateSchema = z.object({
	userType: z.enum([UserTypes.INSTRUCTOR, UserTypes.PARENT, UserTypes.STUDENT]),
	action: z.enum([FacebookOAuthAction.LOGIN, FacebookOAuthAction.SIGNUP]),
});

export const facebookCallbackSchema = z.object({
	code: z.string(),
	state: z.string(),
});
