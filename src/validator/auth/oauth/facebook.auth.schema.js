import z from "zod";
import { UserTypes } from "#enums/user.enums";

export const facebookAuthenticateSchema = z.object({
	userType: z.enum([UserTypes.INSTRUCTOR, UserTypes.PARENT, UserTypes.STUDENT]),
});

export const facebookCallbackSchema = z.object({
	code: z.string(),
	state: z.string(),
});
