import { logger } from "#utils/logger";
import {
	PaymentGatewayInterface,
	registerGateway,
} from "#services/payment/gateway.interface";

/**
 * Flutterwave payment gateway — stub implementation.
 * Full implementation pending Flutterwave merchant onboarding.
 */
export class FlutterwaveGateway extends PaymentGatewayInterface {
	static instance = null;

	static getInstance() {
		if (!FlutterwaveGateway.instance) {
			FlutterwaveGateway.instance = new FlutterwaveGateway();
		}
		return FlutterwaveGateway.instance;
	}

	async initializeTransaction(params) {
		logger.warn("Flutterwave gateway not yet implemented", { params });
		throw new Error(
			"Flutterwave payments are not yet available. Please use Paystack.",
		);
	}

	async verifyTransaction(_reference) {
		throw new Error("Flutterwave gateway not yet implemented.");
	}

	verifyWebhookSignature(_body, _signature) {
		throw new Error("Flutterwave gateway not yet implemented.");
	}

	async initiateTransfer(_params) {
		throw new Error("Flutterwave gateway not yet implemented.");
	}

	async resolveAccountName(_bankCode, _accountNumber) {
		throw new Error("Flutterwave gateway not yet implemented.");
	}

	async getBankList() {
		throw new Error("Flutterwave gateway not yet implemented.");
	}
}

registerGateway("flutterwave", FlutterwaveGateway.getInstance());
