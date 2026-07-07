import { Subscription } from "#models/payment/subscription.model";
import {
	throwBadRequestError,
	throwNotFoundError,
	throwForbiddenError,
} from "#helpers/errors/throw-error";

export class SubscriptionService {
	static instance = null;

	/** @returns {SubscriptionService} */
	static getInstance() {
		if (!SubscriptionService.instance) {
			SubscriptionService.instance = new SubscriptionService();
		}
		return SubscriptionService.instance;
	}

	/** @private */
	constructor() {}

	getMySubscriptions = async (studentId) => {
		const data = await Subscription.find({ studentId })
			.sort({ createdAt: -1 })
			.lean();
		return { data };
	};

	cancel = async (studentId, subscriptionId) => {
		const sub = await Subscription.findById(subscriptionId);
		if (!sub) throwNotFoundError("Subscription not found.");
		if (sub.studentId.toString() !== studentId.toString()) {
			throwForbiddenError("You do not own this subscription.");
		}
		if (sub.status === "cancelled" || sub.status === "expired") {
			throwBadRequestError("Subscription is already cancelled or expired.");
		}

		sub.autoRenew = false;
		sub.status = "cancelled";
		await sub.save();
		return sub;
	};
}
