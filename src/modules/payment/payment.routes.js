import Router from "express";
import { z } from "zod";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import { PaymentController } from "#modules/payment/payment.controller";
import { SubscriptionService } from "#modules/payment/subscription.service";
import { sendSuccessResponse } from "#helpers/responses/index";

export const paymentRouter = Router();

const zodEngine = ZodEngine.getInstance();
const controller = PaymentController.getInstance();

// ─── Initialize payment ──────────────────────────────────────────────────────

paymentRouter.post(
	"/payments/initialize",
	authenticate,
	zodEngine.validate.body(
		z.object({
			targetType: z.enum(["course", "community"]),
			targetId: z.string().min(1),
			gateway: z
				.enum(["paystack", "flutterwave", "stripe"])
				.default("paystack"),
			paymentType: z.enum(["one_time", "subscription"]).default("one_time"),
			referralCode: z.string().optional(),
		}),
	),
	controller.initialize,
);

// ─── Verify payment ──────────────────────────────────────────────────────────

paymentRouter.get(
	"/payments/verify/:reference",
	authenticate,
	zodEngine.validate.params(z.object({ reference: z.string().min(1) })),
	controller.verify,
);

// ─── My payments ─────────────────────────────────────────────────────────────

paymentRouter.get(
	"/users/me/payments",
	authenticate,
	zodEngine.validate.query(
		z.object({
			page: z.coerce.number().int().min(1).default(1),
			limit: z.coerce.number().int().min(1).max(100).default(20),
			status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
		}),
	),
	controller.getMyPayments,
);

// ─── Paystack webhooks (no auth) ─────────────────────────────────────────────

paymentRouter.post(
	"/payments/webhooks/paystack/transfer",
	controller.paystackTransferWebhook,
);
paymentRouter.post("/payments/webhooks/paystack", controller.paystackWebhook);

// ─── Subscriptions ───────────────────────────────────────────────────────────

const subscriptionService = SubscriptionService.getInstance();

paymentRouter.get("/users/me/subscriptions", authenticate, async (req, res) => {
	const data = await subscriptionService.getMySubscriptions(req.user._id);
	return sendSuccessResponse(res, data);
});

paymentRouter.post(
	"/subscriptions/:id/cancel",
	authenticate,
	zodEngine.validate.params(z.object({ id: z.string().min(1) })),
	async (req, res) => {
		const data = await subscriptionService.cancel(req.user._id, req.params.id);
		return sendSuccessResponse(res, {
			message: "Subscription cancelled.",
			data,
		});
	},
);
