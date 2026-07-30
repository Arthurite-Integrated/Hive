import { mongoConnection } from "../src/connection/mongo.connection.js";
import { redisConnection } from "../src/connection/redis.connection.js";
import { EmailWorkerService } from "../src/services/workers/email.worker.service.js";
import { PaymentWorkerService } from "../src/services/workers/payment.worker.service.js";

redisConnection();
mongoConnection(() => {
	EmailWorkerService.getInstance();
	PaymentWorkerService.getInstance();
});
