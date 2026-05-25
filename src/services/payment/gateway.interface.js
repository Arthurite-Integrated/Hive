/**
 * Abstract base class for payment gateways.
 * All concrete gateway implementations must extend this class.
 */
export class PaymentGatewayInterface {
	/**
	 * Initialize a payment transaction.
	 * @param {{ amount: number, email: string, currency: string, reference: string, metadata: object, callbackUrl: string }} params
	 * @returns {Promise<{ authorizationUrl: string, accessCode: string, reference: string }>}
	 */
	async initializeTransaction({
		_amount,
		_email,
		_currency,
		_reference,
		_metadata,
		_callbackUrl,
	}) {
		throw new Error("Not implemented");
	}

	/**
	 * Verify a transaction by its reference.
	 * @param {string} reference
	 * @returns {Promise<{ status: string, amount: number, reference: string, paidAt: string }>}
	 */
	async verifyTransaction(_reference) {
		throw new Error("Not implemented");
	}

	/**
	 * Verify the webhook signature from the gateway.
	 * @param {string | Buffer} body  — raw request body
	 * @param {string} signature      — signature header from the gateway
	 * @returns {boolean}
	 */
	verifyWebhookSignature(_body, _signature) {
		throw new Error("Not implemented");
	}

	/**
	 * Initiate a bank transfer (payout).
	 * @param {{ amount: number, bankCode: string, accountNumber: string, accountName: string, reference: string, narration: string }} params
	 * @returns {Promise<object>}
	 */
	async initiateTransfer({
		_amount,
		_bankCode,
		_accountNumber,
		_accountName,
		_reference,
		_narration,
	}) {
		throw new Error("Not implemented");
	}

	/**
	 * Resolve a bank account name.
	 * @param {string} bankCode
	 * @param {string} accountNumber
	 * @returns {Promise<{ accountName: string, accountNumber: string }>}
	 */
	async resolveAccountName(_bankCode, _accountNumber) {
		throw new Error("Not implemented");
	}

	/**
	 * Fetch the list of supported banks.
	 * @returns {Promise<Array<{ name: string, code: string }>>}
	 */
	async getBankList() {
		throw new Error("Not implemented");
	}
}

// ─── Gateway Registry ─────────────────────────────────────────────────────────

/** @type {Map<string, PaymentGatewayInterface>} */
const gatewayRegistry = new Map();

/**
 * Register a gateway instance by name.
 * @param {string} name
 * @param {PaymentGatewayInterface} instance
 */
export function registerGateway(name, instance) {
	gatewayRegistry.set(name, instance);
}

/**
 * Retrieve a registered gateway by name.
 * @param {string} name
 * @returns {PaymentGatewayInterface}
 */
export function getGateway(name) {
	const gateway = gatewayRegistry.get(name);
	if (!gateway) {
		throw new Error(`Payment gateway "${name}" is not registered.`);
	}
	return gateway;
}
