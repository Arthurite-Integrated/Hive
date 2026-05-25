import { z } from "zod";

export const createCommunitySchema = z.object({
	name: z.string().min(2).max(100),
	description: z.string().max(1000).optional(),
	category: z.string().optional(),
	visibility: z.enum(["public", "private"]).default("public"),
	requireApproval: z.boolean().default(false),
	paymentRequired: z.boolean().default(false),
	monthlyPrice: z.number().int().min(0).optional(),
});

export const updateCommunitySchema = createCommunitySchema
	.extend({
		coverImage: z.string().optional(),
	})
	.partial();

export const communitySlugParamSchema = z.object({ slug: z.string().min(1) });
