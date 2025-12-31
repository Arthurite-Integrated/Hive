import { TTL } from "#constants/ttl.constant";
import { QueueNames } from "#enums/queue/index";
import { getBullMQRedisClient } from "#connection/bullmq.redis.connection";
import { logger } from "#utils/logger";
import { Queue, QueueEvents } from "bullmq";

export class EmailQueueService {
  static instance = null;

  /** @returns {EmailQueueService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new EmailQueueService();
    }
    return this.instance;
  }

  constructor() {
    const redisClient = getBullMQRedisClient();
    this.queue = new Queue(QueueNames.EMAIL, {
      connection: redisClient,
    });
    this.queueEvents = new QueueEvents(QueueNames.EMAIL, {
      connection: redisClient,
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
      removeOnComplete: {
        age: TTL.IN_AN_HOUR,
        count: 1000,
      },
      removeOnFail: {
        age: TTL.IN_24_HOURS,
      },
    });
  }
}