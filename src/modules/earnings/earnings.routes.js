import Router from "express";
import { authenticate, requireRole } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import { z } from "zod";
import { EarningsController } from "#modules/earnings/earnings.controller";

export const earningsRouter = Router();
const zodEngine = ZodEngine.getInstance();
const controller = EarningsController.getInstance();

// All routes require authentication + instructor role

// GET /teachers/me/earnings/balance
earningsRouter.get(
	"/teachers/me/earnings/balance",
	authenticate,
	requireRole("instructor"),
	controller.getBalance,
);

// GET /teachers/me/earnings/history
earningsRouter.get(
	"/teachers/me/earnings/history",
	authenticate,
	requireRole("instructor"),
	zodEngine.validate.query(
		z
			.object({
				page: z.coerce.number().int().min(1).default(1),
				limit: z.coerce.number().int().min(1).max(100).default(20),
				from: z.string().optional(),
				to: z.string().optional(),
			})
			.partial(),
	),
	controller.getHistory,
);

// POST /teachers/me/withdraw
earningsRouter.post(
	"/teachers/me/withdraw",
	authenticate,
	requireRole("instructor"),
	zodEngine.validate.body(
		z.object({
			amount: z.number().int().positive(),
			bankName: z.string().min(1),
			accountNumber: z.string().min(10).max(10),
			accountName: z.string().min(1),
		}),
	),
	controller.requestWithdrawal,
);

// GET /teachers/me/withdrawals
earningsRouter.get(
	"/teachers/me/withdrawals",
	authenticate,
	requireRole("instructor"),
	zodEngine.validate.query(
		z
			.object({
				page: z.coerce.number().int().min(1).default(1),
				limit: z.coerce.number().int().min(1).max(100).default(20),
				status: z
					.enum(["pending", "processing", "completed", "failed"])
					.optional(),
			})
			.partial(),
	),
	controller.getWithdrawals,
);

// POST /teachers/me/banks/verify
earningsRouter.post(
	"/teachers/me/banks/verify",
	authenticate,
	requireRole("instructor"),
	zodEngine.validate.body(
		z.object({
			bankCode: z.string().min(1),
			accountNumber: z.string().min(10).max(10),
		}),
	),
	controller.verifyBank,
);

// GET /teachers/me/analytics
earningsRouter.get(
	"/teachers/me/analytics",
	authenticate,
	requireRole("instructor"),
	zodEngine.validate.query(
		z
			.object({
				period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
			})
			.partial(),
	),
	controller.getAnalytics,
);

// GET /teachers/me/analytics/courses/:courseId
earningsRouter.get(
	"/teachers/me/analytics/courses/:courseId",
	authenticate,
	requireRole("instructor"),
	zodEngine.validate.params(z.object({ courseId: z.string().min(1) })),
	zodEngine.validate.query(
		z
			.object({
				period: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
			})
			.partial(),
	),
	controller.getCourseAnalytics,
);
