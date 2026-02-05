import z from "zod";
import { AUTH_LOGIN_TYPES } from "#constants/auth/auth";
import { UserTypes } from "#enums/user.enums";

export const loginSchema = z
	.object({
		loginType: z.enum(Object.values(AUTH_LOGIN_TYPES)),
		email: z.email(),
		password: z.string().min(8).max(100).optional(),
		userType: z.enum([
			UserTypes.INSTRUCTOR,
			UserTypes.PARENT,
			UserTypes.STUDENT,
		]),
	})
	.superRefine((data, ctx) => {
		if (data.loginType === AUTH_LOGIN_TYPES.PASSWORD) {
			if (!data.password) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Password is required",
				});
			}
		}
	});

export const signupSchema = z.object({
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1),
	email: z.email().max(100),
	userType: z.enum([UserTypes.INSTRUCTOR, UserTypes.PARENT, UserTypes.STUDENT]),
	password: z
		.string()
		.min(8, { message: "Password must be at least 8 characters" })
		.max(100, { message: "Password must be at most 100 characters" })
		.refine((value) => /[a-z]/.test(value), {
			message: "Password must contain at least one lowercase letter",
		})
		.refine((value) => /[A-Z]/.test(value), {
			message: "Password must contain at least one uppercase letter",
		})
		.refine((value) => /\d/.test(value), {
			message: "Password must contain at least one number",
		})
		.refine((value) => /[\W_]/.test(value), {
			message: "Password must contain at least one special character",
		})
		.optional(),
});
