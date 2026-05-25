import { randomUUID } from "crypto";
import { throwBadRequestError } from "#helpers/errors/throw-error";
import { TeacherBalance } from "#models/payment/teacher-balance.model";
import { Withdrawal } from "#models/payment/withdrawal.model";

const MIN_WITHDRAWAL = 100000; // ₦1000 in kobo
const WITHDRAWAL_FEE = 5000; // ₦50 flat fee in kobo

export class WithdrawalService {
	static instance = null;

	/** @returns {WithdrawalService} */
	static getInstance() {
		if (!WithdrawalService.instance) {
			WithdrawalService.instance = new WithdrawalService();
		}
		return WithdrawalService.instance;
	}

	/** @private */
	constructor() {}

	requestWithdrawal = async (
		teacherId,
		{ amount, bankName, accountNumber, accountName },
	) => {
		if (amount < MIN_WITHDRAWAL) {
			throwBadRequestError(
				`Minimum withdrawal is ₦${(MIN_WITHDRAWAL / 100).toLocaleString()}.`,
			);
		}

		const balance = await TeacherBalance.findOne({ teacherId });
		if (!balance || balance.availableBalance < amount) {
			throwBadRequestError("Insufficient available balance.");
		}

		const fee = WITHDRAWAL_FEE;
		const netAmount = amount - fee;

		// Atomically deduct
		const updated = await TeacherBalance.findOneAndUpdate(
			{ teacherId, availableBalance: { $gte: amount } },
			{
				$inc: { availableBalance: -amount },
				$set: { lastWithdrawalAt: new Date() },
			},
			{ new: true },
		);
		if (!updated) throwBadRequestError("Insufficient available balance.");

		const withdrawal = await Withdrawal.create({
			teacherId,
			amount,
			fee,
			netAmount,
			bankName,
			accountNumber,
			accountName,
			status: "pending",
			reference: `WD-${randomUUID()}`,
		});

		return withdrawal;
	};

	getWithdrawals = async (teacherId, { page = 1, limit = 20, status } = {}) => {
		const filter = { teacherId };
		if (status) filter.status = status;

		const [data, total] = await Promise.all([
			Withdrawal.find(filter)
				.sort({ createdAt: -1 })
				.skip((page - 1) * limit)
				.limit(limit)
				.lean(),
			Withdrawal.countDocuments(filter),
		]);

		return {
			data,
			page,
			limit,
			total,
			hasMore: page * limit < total,
		};
	};

	verifyBank = async ({ bankCode, accountNumber }) => {
		// Placeholder — in production this calls Paystack API
		// For now return a mock response
		return { accountName: "Account Holder", bankCode, accountNumber };
	};
}
