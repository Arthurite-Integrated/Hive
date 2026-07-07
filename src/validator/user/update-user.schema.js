import { z } from "zod";

export const updateUserSchema = z
	.object({
		firstName: z.string().min(1).max(100).optional(),
		lastName: z.string().min(1).max(100).optional(),
		bio: z.string().max(1000).optional(),
		phone: z.string().optional(),
		preferences: z
			.object({
				emailNotifications: z.boolean().optional(),
				progressReport: z.enum(["weekly", "monthly"]).optional(),
			})
			.optional(),
		// Instructor-only: allowed but silently ignored for other roles in the service layer
		specializations: z.array(z.string().max(200)).optional(),
	})
	.strip();
