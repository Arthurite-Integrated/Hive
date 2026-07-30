import z from "zod";
import { UserTypes } from "#enums/user.enums";

export const googleAuthenticateSchema = z.object({
	userType: z.enum([UserTypes.INSTRUCTOR, UserTypes.PARENT, UserTypes.STUDENT]),
});

export const googleCallbackSchema = z.object({
	code: z.string(),
	state: z.string(),
});
