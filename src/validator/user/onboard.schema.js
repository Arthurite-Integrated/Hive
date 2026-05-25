import { z } from "zod";

export const onboardSchema = z
	.object({
		bio: z.string().max(500).optional(),
		preferences: z
			.object({
				emailNotifications: z.boolean().optional(),
				progressReport: z.enum(["weekly", "monthly"]).optional(),
			})
			.optional(),
		interests: z.array(z.string()).optional(),
		specializations: z.array(z.string()).optional(),
		gradeExperienceLevels: z.array(z.string()).optional(),
		yearsOfExperience: z.number().min(0).optional(),
		teachingMode: z.array(z.enum(["online", "offline", "hybrid"])).optional(),
		phone: z.string().optional(),
	})
	.strip();
