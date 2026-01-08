import z from "zod";

export const createInstructorSchema = z.object({
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1),
	email: z.string().email().max(100),
	password: z.string().min(8).max(100),
});
