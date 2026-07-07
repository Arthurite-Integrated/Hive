import { z } from "zod";

export const createPostSchema = z.object({
	content: z.string().min(1).max(5000),
	attachments: z
		.array(
			z.object({
				type: z.enum(["image", "file", "link"]),
				url: z.string().url(),
				name: z.string().optional(),
				size: z.number().optional(),
			}),
		)
		.optional(),
	isAnnouncement: z.boolean().optional(),
});

export const updatePostSchema = createPostSchema.partial();

export const createCommentSchema = z.object({
	content: z.string().min(1).max(1000),
});

export const postIdParamSchema = z.object({
	slug: z.string().min(1),
	postId: z.string().min(1),
});
