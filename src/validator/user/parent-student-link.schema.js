import { z } from "zod";

export const linkStudentSchema = z.object({
	studentEmail: z.string().email("Please provide a valid student email"),
	relationship: z
		.enum(["parent", "guardian", "sponsor", "other"])
		.default("parent"),
});

export const linkIdParamSchema = z.object({
	linkId: z.string().min(1, "Link ID is required"),
});
