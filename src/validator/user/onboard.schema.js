import { z } from "zod";

export const onboardSchema = z
	.object({
		bio: z.string().max(500).optional(),
		preferences: z.record(z.unknown()).optional(),
		interests: z.array(z.string()).optional(),
		specialization: z.string().max(200).optional(),
		subjects: z.array(z.string()).optional(),
		gradeLevels: z.array(z.string()).optional(),
		preferredTeachingMode: z.enum(["online", "in-person", "hybrid"]).optional(),
		phone: z.string().optional(),
		location: z
			.object({
				address: z.string(),
				city: z.string(),
				state: z.string(),
				country: z.string(),
				zipCode: z.string().optional(),
			})
			.optional(),
	})
	.strip();
