import z from "zod";

export const enrollBodySchema = z.object({
	paymentType: z
		.enum(["free", "one_time", "subscription"])
		.optional()
		.default("free"),
	referralCode: z.string().optional(),
});

export const enrollParamSchema = z.object({
	courseId: z.string().min(1, "courseId is required"),
});

export const enrollmentsQuerySchema = z.object({
	status: z.enum(["active", "expired", "cancelled", "completed"]).optional(),
	page: z.coerce.number().int().min(1).optional().default(1),
	limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
