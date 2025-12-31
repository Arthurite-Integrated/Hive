import { QueueNames } from "#enums/queue/index";
import { EmailService } from "#services/mail.service";
import { getBullMQRedisClient } from "#connection/bullmq.redis.connection";
import { Worker } from "bullmq";
import { logger } from "#utils/logger";

export class EmailWorkerService {
  static instance = null;

  /** @returns {EmailWorkerService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new EmailWorkerService();
    }
    return this.instance;
  }

  constructor(concurrency = 10) {
    this.emailService = EmailService.getInstance();
    const redisClient = getBullMQRedisClient();
    this.worker = new Worker(QueueNames.EMAIL, async (job) => {
      const { message, template, locals } = job.data;
      await this.emailService.send({ message, template, locals });
      }, 
      { 
        concurrency, 
        connection: redisClient,
      }
    );
    this._setupJobListeners();
  }

  _setupJobListeners = () => {
    this.worker.on("completed", async (jobId, result) => {
      logger.info(`Email job ${jobId} completed`, result);
    });

    this.worker.on("failed", async (jobId, error) => {
      logger.info(`Email job ${jobId} failed`, error);
    });
  }

  stop = async () => {
    await this.worker.close();
  }
}

process.on('SIGTERM', async () => {
  await EmailWorkerService.getInstance().stop();
});

process.on('SIGINT', async () => {
  await EmailWorkerService.getInstance().stop();
});