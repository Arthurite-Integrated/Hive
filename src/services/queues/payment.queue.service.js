import { Queue } from "bullmq";
import { QueueNames } from "#enums/queue/index";
import { CacheService } from "#services/cache.service";
import { logger } from "#utils/logger";

export class PaymentQueueService {
	static instance = null;

	/** @returns {PaymentQueueService} */
	static getInstance() {
		if (!PaymentQueueService.instance) {
			PaymentQueueService.instance = new PaymentQueueService();
		}
		return PaymentQueueService.instance;
	}

	constructor() {
		this.cacheService = CacheService.getInstance();
		this.queue = new Queue(QueueNames.PAYMENT, {
			connection: this.cacheService.redis,
		});
		this._setupListeners();
	}

	/** @private */
	_setupListeners = () => {
		this.queue.on("error", (error) => {
			logger.error("Payment queue error", { error: error.message });
		});
	};

	/**
	 * Add a job to the payment queue.
	 * @param {string} jobName
	 * @param {object} data
	 */
	add = async (jobName, data) => {
		await this.queue.add(jobName, data, {
			attempts: 5,
			backoff: {
				type: "exponential",
				delay: 3000,
			},
			removeOnComplete: {
				age: 3600,
				count: 1000,
			},
			removeOnFail: {
				age: 86400,
			},
		});
	};
}
