import { EmailWorkerService } from "../src/services/workers/email.worker.service.js";
import { PaymentWorkerService } from "../src/services/workers/payment.worker.service.js";

EmailWorkerService.getInstance();
PaymentWorkerService.getInstance();
