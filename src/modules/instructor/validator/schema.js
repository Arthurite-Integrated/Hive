import { z } from "zod";

export const instructorOnboardSchema = z.object({
	subjects: z.array(z.string()).min(1, "At least one subject is required"),
	gradeLevels: z
		.array(z.string())
		.min(1, "At least one grade level is required"),
	preferredTeachingMode: z.enum(["online", "in-person", "hybrid"]),
	bio: z.string().max(1000, "Bio must be less than 1000 characters").optional(),
	phone: z.string().optional(),
	location: z.object({
		address: z.string(),
		city: z.string(),
		state: z.string(),
		country: z.string(),
		zipCode: z.string().optional(),
	}),
});
