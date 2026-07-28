import { logger } from "#utils/logger";
import {
	PaymentGatewayInterface,
	registerGateway,
} from "#services/payment/gateway.interface";

/**
 * Stripe payment gateway — stub implementation.
 * Full implementation pending Stripe Connect onboarding.
 */
export class StripeGateway extends PaymentGatewayInterface {
	static instance = null;

	static getInstance() {
		if (!StripeGateway.instance) {
			StripeGateway.instance = new StripeGateway();
		}
		return StripeGateway.instance;
	}

	async initializeTransaction(params) {
		logger.warn("Stripe gateway not yet implemented", { params });
		throw new Error(
			"Stripe payments are not yet available. Please use Paystack.",
		);
	}

	async verifyTransaction(_reference) {
		throw new Error("Stripe gateway not yet implemented.");
	}

	verifyWebhookSignature(_body, _signature) {
		throw new Error("Stripe gateway not yet implemented.");
	}

	async initiateTransfer(_params) {
		throw new Error("Stripe gateway not yet implemented.");
	}

	async resolveAccountName(_bankCode, _accountNumber) {
		throw new Error("Stripe gateway not yet implemented.");
	}

	async getBankList() {
		throw new Error("Stripe gateway not yet implemented.");
	}
}

registerGateway("stripe", StripeGateway.getInstance());
