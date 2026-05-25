import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { EarningsService } from "#modules/earnings/earnings.service";
import { WithdrawalService } from "#modules/earnings/withdrawal.service";
import { AnalyticsService } from "#modules/earnings/analytics.service";
import { throwNotFoundError } from "#helpers/errors/throw-error";

export class EarningsController {
	static instance = null;

	/** @returns {EarningsController} */
	static getInstance() {
		if (!EarningsController.instance) {
			EarningsController.instance = new EarningsController();
		}
		return EarningsController.instance;
	}

	/** @private */
	constructor() {
		this.earningsService = EarningsService.getInstance();
		this.withdrawalService = WithdrawalService.getInstance();
		this.analyticsService = AnalyticsService.getInstance();
	}

	// ─── Earnings ───────────────────────────────────────────────────────────────

	getBalance = async (req, res) => {
		const data = await this.earningsService.getBalance(req.user._id);
		return sendSuccessResponse(res, { data });
	};

	getHistory = async (req, res) => {
		const data = await this.earningsService.getHistory(req.user._id, req.query);
		return sendSuccessResponse(res, { ...data });
	};

	// ─── Withdrawals ────────────────────────────────────────────────────────────

	requestWithdrawal = async (req, res) => {
		const data = await this.withdrawalService.requestWithdrawal(
			req.user._id,
			req.body,
		);
		return sendSuccessResponse(
			res,
			{ message: "Withdrawal requested.", data },
			StatusCodes.CREATED,
		);
	};

	getWithdrawals = async (req, res) => {
		const data = await this.withdrawalService.getWithdrawals(
			req.user._id,
			req.query,
		);
		return sendSuccessResponse(res, { ...data });
	};

	verifyBank = async (req, res) => {
		const data = await this.withdrawalService.verifyBank(req.body);
		return sendSuccessResponse(res, { data });
	};

	// ─── Analytics ──────────────────────────────────────────────────────────────

	getAnalytics = async (req, res) => {
		const data = await this.analyticsService.getOverview(
			req.user._id,
			req.query,
		);
		return sendSuccessResponse(res, { data });
	};

	getCourseAnalytics = async (req, res) => {
		const data = await this.analyticsService.getCourseAnalytics(
			req.user._id,
			req.params.courseId,
			req.query,
		);
		if (!data) throwNotFoundError("Course not found or not owned by you.");
		return sendSuccessResponse(res, { data });
	};
}
