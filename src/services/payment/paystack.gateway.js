import crypto from "crypto";
import { config } from "#config/config";
import { logger } from "#utils/logger";
import { CacheService } from "#services/cache.service";
import {
	PaymentGatewayInterface,
	registerGateway,
} from "#services/payment/gateway.interface";
import { TTL } from "#constants/ttl.constant";
import { throwBadRequestError } from "#helpers/errors/throw-error";

const PAYSTACK_BASE_URL = "https://api.paystack.co";
const BANKS_CACHE_KEY = "paystack:banks";

export class PaystackGateway extends PaymentGatewayInterface {
	static instance = null;

	/** @returns {PaystackGateway} */
	static getInstance() {
		if (!PaystackGateway.instance) {
			PaystackGateway.instance = new PaystackGateway();
		}
		return PaystackGateway.instance;
	}

	constructor() {
		super();
		this.cacheService = CacheService.getInstance();
	}

	// ─── Private helpers ──────────────────────────────────────────────────────

	/** @private */
	_headers() {
		return {
			Authorization: `Bearer ${config.paystack.secretKey}`,
			"Content-Type": "application/json",
		};
	}

	/**
	 * @private
	 * Perform a fetch against the Paystack API and return the parsed JSON body.
	 * Throws a BadRequest error if Paystack reports status=false.
	 */
	async _request(method, path, body = undefined) {
		const url = `${PAYSTACK_BASE_URL}${path}`;
		const options = {
			method,
			headers: this._headers(),
		};
		if (body !== undefined) {
			options.body = JSON.stringify(body);
		}

		const response = await fetch(url, options);
		const json = await response.json();

		if (!json.status) {
			logger.error("Paystack API error", {
				path,
				status: response.status,
				message: json.message,
			});
			throwBadRequestError(json.message || "Paystack request failed.");
		}

		return json;
	}

	// ─── Public API ───────────────────────────────────────────────────────────

	/**
	 * Initialize a Paystack transaction.
	 * @returns {Promise<{ authorizationUrl: string, accessCode: string, reference: string }>}
	 */
	async initializeTransaction({
		amount,
		email,
		currency,
		reference,
		metadata,
		callbackUrl,
	}) {
		const json = await this._request("POST", "/transaction/initialize", {
			amount,
			email,
			currency: currency || "NGN",
			reference,
			metadata,
			callback_url: callbackUrl,
		});

		const { authorization_url, access_code, reference: ref } = json.data;
		return {
			authorizationUrl: authorization_url,
			accessCode: access_code,
			reference: ref,
		};
	}

	/**
	 * Verify a Paystack transaction by reference.
	 * @returns {Promise<{ status: string, amount: number, reference: string, paidAt: string }>}
	 */
	async verifyTransaction(reference) {
		const json = await this._request(
			"GET",
			`/transaction/verify/${encodeURIComponent(reference)}`,
		);
		const { status, amount, reference: ref, paid_at } = json.data;
		return {
			status,
			amount,
			reference: ref,
			paidAt: paid_at,
		};
	}

	/**
	 * Verify Paystack webhook HMAC-SHA512 signature.
	 * @param {string | Buffer} body
	 * @param {string} signature
	 * @returns {boolean} — throws BadRequest if invalid
	 */
	verifyWebhookSignature(body, signature) {
		const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
		const expected = crypto
			.createHmac("sha512", config.paystack.webhookSecret)
			.update(rawBody)
			.digest("hex");

		const isValid = expected === signature;
		if (!isValid) {
			throwBadRequestError("Invalid webhook signature.");
		}
		return true;
	}

	/**
	 * Initiate a bank transfer via Paystack.
	 * Creates a transfer recipient first, then initiates the transfer.
	 * @returns {Promise<object>} — Paystack transfer response data
	 */
	async initiateTransfer({
		amount,
		bankCode,
		accountNumber,
		accountName,
		reference,
		narration,
	}) {
		// 1. Create transfer recipient
		const recipientJson = await this._request("POST", "/transferrecipient", {
			type: "nuban",
			name: accountName,
			account_number: accountNumber,
			bank_code: bankCode,
			currency: "NGN",
		});

		const recipientCode = recipientJson.data.recipient_code;

		// 2. Initiate the transfer
		const transferJson = await this._request("POST", "/transfer", {
			source: "balance",
			amount,
			recipient: recipientCode,
			reference,
			reason: narration,
		});

		return transferJson.data;
	}

	/**
	 * Resolve a bank account name via Paystack.
	 * @returns {Promise<{ accountName: string, accountNumber: string }>}
	 */
	async resolveAccountName(bankCode, accountNumber) {
		const json = await this._request(
			"GET",
			`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
		);
		return {
			accountName: json.data.account_name,
			accountNumber: json.data.account_number,
		};
	}

	/**
	 * Fetch NGN bank list from Paystack, cached in Redis for 24 hours.
	 * @returns {Promise<Array<{ name: string, code: string }>>}
	 */
	async getBankList() {
		const cached = await this.cacheService.get(BANKS_CACHE_KEY);
		if (cached) {
			return cached;
		}

		const json = await this._request("GET", "/bank?currency=NGN&perPage=200");
		const banks = json.data.map((b) => ({ name: b.name, code: b.code }));

		await this.cacheService.set(BANKS_CACHE_KEY, banks, TTL.IN_24_HOURS);
		return banks;
	}
}

// Register the Paystack gateway so getGateway('paystack') works
registerGateway("paystack", PaystackGateway.getInstance());
