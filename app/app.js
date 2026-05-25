import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { errorHandler } from "#middlewares/error/index";
import { routeNotFound } from "#middlewares/route-not-found";
import { appRouter } from "#routes/router";
import { EmailQueueService } from "#services/queues/email.queue.service";
import { PaymentQueueService } from "#services/queues/payment.queue.service";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

app.use("/api/v1/", appRouter);

app.get(/^\/(api\/v1)?(\/)?$/, (_req, res) => {
	return res.send({
		success: true,
		message: "Hello! Hive backend active!",
	});
});

/** Bull MQ Dashboard — must be registered before routeNotFound */
const bullMQAdapter = new ExpressAdapter();
bullMQAdapter.setBasePath("/queue");
createBullBoard({
	queues: [
		new BullMQAdapter(EmailQueueService.getInstance().queue),
		new BullMQAdapter(PaymentQueueService.getInstance().queue),
	],
	serverAdapter: bullMQAdapter,
});
app.use("/queue", bullMQAdapter.getRouter());

app.use(routeNotFound);
app.use(errorHandler);

export { app };
