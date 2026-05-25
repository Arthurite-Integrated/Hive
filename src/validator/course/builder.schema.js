import { z } from "zod";

export const createModuleSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().optional(),
});

export const updateModuleSchema = createModuleSchema.partial();

export const reorderSchema = z.object({
	items: z.array(
		z.object({
			moduleId: z.string().min(1),
			orderIndex: z.number().int().min(0),
		}),
	),
});

export const createLessonSchema = z.object({
	title: z.string().min(1).max(200),
	type: z.enum(["video", "pdf", "text", "live", "quiz", "assignment"]),
});

export const updateLessonSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	isFreePreview: z.boolean().optional(),
	dripDate: z.string().optional(),
	scheduledAt: z.string().optional(),
	duration: z.number().optional(),
	meetingLink: z.string().optional(),
	platform: z.enum(["zoom", "meet", "teams", "other"]).optional(),
	status: z.enum(["draft", "published"]).optional(),
	textContent: z.string().optional(),
});

export const videoUploadSchema = z.object({
	contentType: z.string().refine((v) => v.startsWith("video/"), {
		message: "contentType must be a video/* MIME type",
	}),
	sizeBytes: z.number().int().positive(),
});

export const finalizeVideoSchema = z.object({
	key: z.string().min(1),
});

export const pdfUploadSchema = z.object({
	contentType: z.string(),
});

export const finalizePdfSchema = z.object({
	key: z.string().min(1),
});

export const addAttachmentSchema = z.object({
	name: z.string().min(1),
	key: z.string().min(1),
	size: z.number().positive(),
	type: z.string().min(1),
});
