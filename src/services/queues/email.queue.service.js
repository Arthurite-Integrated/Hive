import { Queue, QueueEvents } from "bullmq";
import { TTL } from "#constants/ttl.constant";
import { QueueNames } from "#enums/queue/index";
import { logger } from "#utils/logger";
import { CacheService } from "#services/cache.service";

export class EmailQueueService {
	static instance = null;

	/** @returns {EmailQueueService} */
	static getInstance() {
		if (!EmailQueueService.instance) {
			EmailQueueService.instance = new EmailQueueService();
		}
		return EmailQueueService.instance;
	}

	constructor() {
		this.cacheService = CacheService.getInstance();
		this.queue = new Queue(QueueNames.EMAIL, {
			connection: this.cacheService.redis,
		});
		this.queueEvents = new QueueEvents(QueueNames.EMAIL, {
			connection: this.cacheService.redis,
		});
		this._setupJobListeners();
	}

	_setupJobListeners = () => {
		this.queueEvents.on("completed", async (jobId, result) => {
			logger.info(`Email job ${jobId} completed`, result);
		});

		this.queueEvents.on("failed", async (jobId, error) => {
			logger.info(`Email job ${jobId} failed`, error);
		});

		this.queueEvents.on("waiting", async (jobId) => {
			logger.info(`Email job ${jobId} waiting`);
		});
	};

	add = async (jobName, data) => {
		await this.queue.add(jobName, data, {
			attempts: 3, // Retry failed jobs up to 3 times
			backoff: {
				type: "exponential",
				delay: 2000, // Start with 2 second delay
			},
			timeout: 45000, // 45 seconds timeout for the entire job
			removeOnComplete: {
				age: TTL.IN_AN_HOUR,
				count: 1000,
			},
			removeOnFail: {
				age: TTL.IN_24_HOURS,
			},
		});
	};
}
