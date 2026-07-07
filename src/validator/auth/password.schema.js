import z from "zod";

export const forgotPasswordSchema = z.object({
	email: z.email(),
});

export const resetPasswordSchema = z.object({
	email: z.email(),
	otp: z.string().length(6),
	newPassword: z
		.string()
		.min(8)
		.max(100)
		.refine((v) => /[a-z]/.test(v), {
			message: "Must contain a lowercase letter",
		})
		.refine((v) => /[A-Z]/.test(v), {
			message: "Must contain an uppercase letter",
		})
		.refine((v) => /\d/.test(v), { message: "Must contain a number" })
		.refine((v) => /[\W_]/.test(v), {
			message: "Must contain a special character",
		}),
});
