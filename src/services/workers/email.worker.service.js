import { Worker } from "bullmq";
import { getBullMQRedisClient } from "#connection/bullmq.redis.connection";
import { QueueNames } from "#enums/queue/index";
import { EmailService } from "#services/mail.service";
import { logger } from "#utils/logger";

export class EmailWorkerService {
	static instance = null;

	/** @returns {EmailWorkerService} */
	static getInstance() {
		if (!EmailWorkerService.instance) {
			EmailWorkerService.instance = new EmailWorkerService();
		}
		return EmailWorkerService.instance;
	}

	constructor(concurrency = 10) {
		this.emailService = EmailService.getInstance();
		const redisClient = getBullMQRedisClient();
		this.worker = new Worker(
			QueueNames.EMAIL,
			async (job) => {
				try {
					logger.info(`Processing email job ${job.id}`, {
						jobName: job.name,
						recipient: job.data?.message?.to,
					});
					const { message, template, locals } = job.data;
					await this.emailService.send({ message, template, locals });
					logger.info(`Email job ${job.id} processed successfully`);
				} catch (error) {
					logger.error(`Error processing email job ${job.id}`, {
						error: error.message,
						details: error.details || error.originalError?.details,
						stack: error.stack,
						recipient: job.data?.message?.to,
					});
					throw error; // Re-throw to mark job as failed
				}
			},
			{
				concurrency,
				connection: redisClient,
				lockDuration: 60000, // 60 seconds - how long a job can be processed before considered stalled
				maxStalledCount: 1, // Max times a job can be retried if stalled
				removeOnComplete: {
					age: 3600, // 1 hour
					count: 1000,
				},
				removeOnFail: {
					age: 86400, // 24 hours
				},
			},
		);
		this._setupJobListeners();
	}

	_setupJobListeners = () => {
		this.worker.on("ready", () => {
			logger.info("Email worker is ready to process jobs");
		});

		this.worker.on("active", (job) => {
			logger.info(`Email job ${job.id} is now active`);
		});

		this.worker.on("completed", async (job, result) => {
			logger.info(`Email job ${job.id} completed`, result);
		});

		this.worker.on("failed", async (job, error) => {
			logger.error(`Email job ${job?.id || "unknown"} failed`, {
				error: error.message,
				stack: error.stack,
				jobData: job?.data,
			});
		});

		this.worker.on("stalled", (jobId) => {
			logger.warn(`Email job ${jobId} stalled - taking longer than expected`);
		});

		this.worker.on("error", (error) => {
			logger.error("Email worker error", error);
		});

		this.worker.on("closed", () => {
			logger.warn("Email worker closed");
		});
	};

	stop = async () => {
		await this.worker.close();
	};
}

process.on("SIGTERM", async () => {
	await EmailWorkerService.getInstance().stop();
});

process.on("SIGINT", async () => {
	await EmailWorkerService.getInstance().stop();
});
