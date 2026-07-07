import { z } from "zod";

export const createCourseSchema = z.object({
	title: z.string().min(2).max(200),
	description: z.string().max(5000).optional(),
	category: z.string().optional(),
	difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
	isFree: z.boolean().optional(),
	price: z.number().int().min(0).optional(),
	monthlyPrice: z.number().int().min(0).optional(),
	coverImage: z.string().optional(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const courseIdParamSchema = z.object({ courseId: z.string().min(1) });

export const communitySlugCourseParamSchema = z.object({
	slug: z.string().min(1),
});
