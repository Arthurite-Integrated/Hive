import http from "node:http";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import cors from "cors";
import express from "express";
import { config } from "#config/config";
import { mongoConnection } from "#connection/mongo.connection";
import { redisConnection } from "#connection/redis.connection";
import { errorHandler } from "#middlewares/error/index";
import { RequestLogger } from "#middlewares/request-logger";
import { routeNotFound } from "#middlewares/route-not-found";
import { appRouter } from "#routes/router";
import { EmailQueueService } from "#services/queues/email.queue.service";
import { EmailWorkerService } from "#services/workers/email.worker.service";
import { logger } from "#utils/logger";

let PORT = config.server.port;
const app = express();
const server = http.createServer(app);

const getMessage = (port) => `
================================================
Server Application Started!
API V1: http://${config.server.hostname}:${port}
API Docs: http://${config.server.hostname}:${port}/docs
================================================
`;

app.use(express.json());

/** @info - Cors configuration */
// app.use(
// 	cors({
// 		origin: (origin, callback) => {
// 			// Allow requests with no origin (mobile apps, Postman, etc.)
// 			if (!origin) return callback(null, true);

// 			// Define allowed patterns
// 			const allowedPatterns = [
// 				/^https:\/\/[a-zA-Z0-9-]+\.d9kpauooevxh8\.amplifyapp\.com$/, // Your Amplify domain
// 				/^http:\/\/localhost:\d+$/, // Local development
// 			];

// 			// Check if origin matches any pattern
// 			const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));

// 			if (isAllowed) {
// 				callback(null, true);
// 			} else {
// 				console.log("❌ Blocked origin:", origin);
// 				callback(new Error("Not allowed by CORS"));
// 			}
// 		},
// 		methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
// 		allowedHeaders: "*",
// 	}),
// );
/** @info - Minimal cors config */
app.use(cors({ origin: "*" }));

// Attempt MongoDB/Redis connection (non-blocking)
mongoConnection(startServer);
redisConnection();

app.use("/api/v1/", appRouter);

app.use(RequestLogger);

app.get(/^\/(api\/v1)?(\/)?$/, (_req, res) => {
	return res.send({
		success: true,
		message: "Hello! Hive backend active!👋",
	});
});

/** Bull MQ Dashboard */
const bullMQAdapter = new ExpressAdapter();
bullMQAdapter.setBasePath("/queue");

createBullBoard({
	queues: [new BullMQAdapter(EmailQueueService.getInstance().queue)],
	serverAdapter: bullMQAdapter,
});

app.use("/queue", bullMQAdapter.getRouter());

app.use(routeNotFound);
app.use(errorHandler);

function startServer(port) {
	server.listen(port, () => {
		EmailWorkerService.getInstance();

		logger.info(`Server is running on port ${port}`);
		console.log(getMessage(port));
	});
}

server.on("error", (error) => {
	if (error.code === "EADDRINUSE") {
		logger.error(`Port ${PORT} is already in use changing to ${PORT + 1}`);
		PORT = PORT + 1;
		startServer(PORT);
	} else {
		console.log(`Error: ${error.message}`);
	}
});
