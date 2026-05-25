import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { PaymentService } from "#modules/payment/payment.service";
import { WebhookService } from "#modules/payment/webhook.service";

export class PaymentController {
	static instance = null;

	/** @returns {PaymentController} */
	static getInstance() {
		if (!PaymentController.instance) {
			PaymentController.instance = new PaymentController();
		}
		return PaymentController.instance;
	}

	/** @private */
	constructor() {
		this.paymentService = PaymentService.getInstance();
		this.webhookService = WebhookService.getInstance();
	}

	// ─── Payment initialization ───────────────────────────────────────────────

	/**
	 * POST /payments/initialize
	 * Body: { targetType, targetId, gateway?, paymentType?, referralCode? }
	 */
	initialize = async (req, res) => {
		const data = await this.paymentService.initialize(
			req.user._id,
			req.userType,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Payment initialized.", data },
			StatusCodes.CREATED,
		);
	};

	// ─── Verify by reference ─────────────────────────────────────────────────

	/**
	 * GET /payments/verify/:reference
	 */
	verify = async (req, res) => {
		const data = await this.paymentService.verifyByReference(
			req.params.reference,
		);
		return sendSuccessResponse(res, { data });
	};

	// ─── My payments ─────────────────────────────────────────────────────────

	/**
	 * GET /users/me/payments
	 */
	getMyPayments = async (req, res) => {
		const data = await this.paymentService.getMyPayments(
			req.user._id,
			req.query,
		);
		return sendSuccessResponse(res, { ...data });
	};

	// ─── Webhooks ─────────────────────────────────────────────────────────────

	/**
	 * POST /payments/webhooks/paystack
	 * No auth — signature verified inside service.
	 */
	paystackWebhook = async (req, res) => {
		// Paystack sends JSON; req.body is already parsed by express.json().
		// We re-stringify so the HMAC is computed against the same bytes Paystack signed.
		const rawBody = JSON.stringify(req.body);
		const signature = req.headers["x-paystack-signature"] || "";
		await this.webhookService.handlePaystack(rawBody, signature);
		return res.sendStatus(StatusCodes.OK);
	};

	/**
	 * POST /payments/webhooks/paystack/transfer
	 * No auth — signature verified inside service.
	 */
	paystackTransferWebhook = async (req, res) => {
		const rawBody = JSON.stringify(req.body);
		const signature = req.headers["x-paystack-signature"] || "";
		await this.webhookService.handleTransferCallback(rawBody, signature);
		return res.sendStatus(StatusCodes.OK);
	};
}
