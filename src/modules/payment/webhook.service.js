import { Payment } from "#models/payment/payment.model";
import { Withdrawal } from "#models/payment/withdrawal.model";
import { TeacherBalance } from "#models/payment/teacher-balance.model";
import { getGateway } from "#services/payment/gateway.interface";
import "#services/payment/paystack.gateway"; // ensure gateway is registered
import { PaymentQueueService } from "#services/queues/payment.queue.service";
import { logger } from "#utils/logger";

export class WebhookService {
	static instance = null;

	/** @returns {WebhookService} */
	static getInstance() {
		if (!WebhookService.instance) {
			WebhookService.instance = new WebhookService();
		}
		return WebhookService.instance;
	}

	constructor() {
		this.paymentQueueService = PaymentQueueService.getInstance();
	}

	// ─── Paystack charge webhook ─────────────────────────────────────────────

	/**
	 * Handle an incoming Paystack charge webhook.
	 * Verifies signature, processes charge.success, enqueues post-payment job.
	 * @param {string} rawBody   — stringified JSON body
	 * @param {string} signature — x-paystack-signature header value
	 */
	handlePaystack = async (rawBody, signature) => {
		// 1. Verify signature — throws BadRequest if invalid
		getGateway("paystack").verifyWebhookSignature(rawBody, signature);

		// 2. Parse event
		const event = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;

		// 3. Only handle charge.success
		if (event.event !== "charge.success") {
			logger.info("Paystack webhook ignored", { event: event.event });
			return;
		}

		const { reference } = event.data;

		// 4. Find payment
		const payment = await Payment.findOne({ gatewayReference: reference });

		// 5. Idempotency guard
		if (!payment || payment.status === "completed") {
			logger.info("Paystack webhook skipped (not found or already completed)", {
				reference,
			});
			return;
		}

		// 6. Update payment status
		payment.status = "completed";
		payment.gatewayResponse = event.data;
		await payment.save();

		// 7. Enqueue post-payment worker job
		await this.paymentQueueService.add("payment.success", {
			paymentId: payment._id.toString(),
		});

		logger.info("Paystack charge.success processed", {
			reference,
			paymentId: payment._id,
		});
	};

	// ─── Paystack transfer webhook ───────────────────────────────────────────

	/**
	 * Handle Paystack transfer callbacks (transfer.success / transfer.failed).
	 * Used for instructor withdrawal payouts.
	 * @param {string} rawBody
	 * @param {string} signature
	 */
	handleTransferCallback = async (rawBody, signature) => {
		// 1. Verify signature
		getGateway("paystack").verifyWebhookSignature(rawBody, signature);

		// 2. Parse event
		const event = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
		const { reference } = event.data;

		// 3. Find withdrawal by its gateway reference
		const withdrawal = await Withdrawal.findOne({ reference });
		if (!withdrawal) {
			logger.info("Transfer webhook: withdrawal not found", { reference });
			return;
		}

		if (event.event === "transfer.success") {
			withdrawal.status = "completed";
			withdrawal.processedAt = new Date();
			await withdrawal.save();

			// Credit withdrawnBalance on TeacherBalance
			await TeacherBalance.findOneAndUpdate(
				{ teacherId: withdrawal.teacherId },
				{ $inc: { withdrawnBalance: withdrawal.amount } },
			);

			logger.info("Transfer success processed", {
				reference,
				teacherId: withdrawal.teacherId,
			});
		} else if (event.event === "transfer.failed") {
			withdrawal.status = "failed";
			withdrawal.failureReason = event.data.reason || "Transfer failed";
			withdrawal.processedAt = new Date();
			await withdrawal.save();

			// Refund the withheld amount back to availableBalance
			await TeacherBalance.findOneAndUpdate(
				{ teacherId: withdrawal.teacherId },
				{ $inc: { availableBalance: withdrawal.amount } },
			);

			logger.info("Transfer failure processed", {
				reference,
				teacherId: withdrawal.teacherId,
			});
		} else {
			logger.info("Transfer webhook event ignored", {
				event: event.event,
				reference,
			});
		}
	};
}
