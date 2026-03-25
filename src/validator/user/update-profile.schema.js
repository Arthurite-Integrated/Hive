import { z } from "zod";

export const updateProfileSchema = z
	.object({
		firstName: z.string().min(1).max(100).optional(),
		lastName: z.string().min(1).max(100).optional(),
		bio: z.string().max(1000).optional(),
		phone: z.string().optional(),
		preferences: z.record(z.unknown()).optional(),
		specialization: z.string().max(200).optional(),
	})
	.strip();
