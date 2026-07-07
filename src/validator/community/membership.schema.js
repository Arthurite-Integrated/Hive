import { z } from "zod";

export const joinSchema = z.object({
	inviteCode: z.string().optional(),
});

export const updateMemberSchema = z
	.object({
		role: z.enum(["admin", "member", "guest"]).optional(),
		status: z.enum(["active", "blocked"]).optional(),
	})
	.refine((data) => data.role !== undefined || data.status !== undefined, {
		message: "At least one of role or status must be provided.",
	});

export const inviteSchema = z.object({
	emails: z.array(z.string().email()).min(1).max(50),
});

export const memberUserIdParamSchema = z.object({
	communityId: z.string().min(1),
	userId: z.string().min(1),
});
