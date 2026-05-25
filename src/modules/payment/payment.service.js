import { config } from "#config/config";
import { Payment } from "#models/payment/payment.model";
import { Course } from "#models/course.model";
import { Community } from "#modules/community/community.model";
import { getUserModel } from "#utils/user-model-router";
import { getGateway } from "#services/payment/gateway.interface";
import "#services/payment/paystack.gateway"; // ensure gateway is registered
import {
	throwBadRequestError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { logger } from "#utils/logger";

export class PaymentService {
	static instance = null;

	/** @returns {PaymentService} */
	static getInstance() {
		if (!PaymentService.instance) {
			PaymentService.instance = new PaymentService();
		}
		return PaymentService.instance;
	}

	// ─── Initialize Payment ──────────────────────────────────────────────────

	/**
	 * Initialize a new payment transaction for a course or community.
	 * @param {string} userId
	 * @param {string} userType
	 * @param {{ targetType: string, targetId: string, gateway?: string, paymentType?: string, referralCode?: string }} body
	 */
	initialize = async (
		userId,
		userType,
		{
			targetType,
			targetId,
			gateway = "paystack",
			paymentType = "one_time",
			_referralCode,
		},
	) => {
		// 1. Validate targetType
		if (!["course", "community"].includes(targetType)) {
			throwBadRequestError("targetType must be 'course' or 'community'.");
		}

		// 2. Load target and resolve amount
		let amount;
		let target;

		if (targetType === "course") {
			target = await Course.findById(targetId).lean();
			if (!target) throwNotFoundError("Course not found.");
			amount = target.price;
		} else {
			target = await Community.findById(targetId).lean();
			if (!target) throwNotFoundError("Community not found.");
			amount = target.monthlyPrice;
		}

		// 3. Free item check
		if (!amount || amount <= 0) {
			throwBadRequestError("This item is free, enroll directly.");
		}

		// 4. Discount amount (referral deferred — Phase 4.4)
		const discountAmount = 0;
		const finalAmount = amount - discountAmount;

		// 5. Generate unique reference
		const reference = `HIVE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

		// 6. Get user email
		const UserModel = getUserModel(userType);
		const user = await UserModel.findById(userId).select("email").lean();
		if (!user) throwNotFoundError("User not found.");

		// 7. Create pending Payment document
		const paymentDoc = {
			studentId: userId,
			paidBy: userId,
			amount: finalAmount,
			currency: "NGN",
			gateway,
			gatewayReference: reference,
			status: "pending",
			paymentType,
			discountAmount,
		};

		if (targetType === "course") {
			paymentDoc.courseId = targetId;
		} else {
			paymentDoc.communityId = targetId;
		}

		const payment = await Payment.create(paymentDoc);

		// 8. Call gateway to get authorization URL
		const gatewayObj = getGateway(gateway);
		const gatewayInit = await gatewayObj.initializeTransaction({
			amount: finalAmount,
			email: user.email,
			currency: "NGN",
			reference,
			metadata: { userId, userType, targetType, targetId },
			callbackUrl: `${config.server.serverDomain}/checkout/success?reference=${reference}`,
		});

		logger.info("Payment initialized", {
			paymentId: payment._id,
			reference,
			userId,
			targetType,
			targetId,
		});

		return { payment, gatewayInit };
	};

	// ─── Verify by Reference ─────────────────────────────────────────────────

	/**
	 * Look up a payment by its gateway reference.
	 * @param {string} reference
	 */
	verifyByReference = async (reference) => {
		const payment = await Payment.findOne({
			gatewayReference: reference,
		}).lean();
		if (!payment) throwNotFoundError("Payment not found.");
		return payment;
	};

	// ─── My Payments ─────────────────────────────────────────────────────────

	/**
	 * Paginated list of payments for the authenticated user.
	 * @param {string} userId
	 * @param {{ page?: number, limit?: number, status?: string }} opts
	 */
	getMyPayments = async (userId, { page = 1, limit = 20, status } = {}) => {
		const filter = { studentId: userId };
		if (status) filter.status = status;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			Payment.find(filter)
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			Payment.countDocuments(filter),
		]);

		return {
			data,
			page,
			limit,
			total,
			hasMore: skip + data.length < total,
		};
	};
}
