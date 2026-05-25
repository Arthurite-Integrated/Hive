import http from "node:http";
import { config } from "#config/config";
import { mongoConnection } from "#connection/mongo.connection";
import { redisConnection } from "#connection/redis.connection";
import { RequestLogger } from "#middlewares/request-logger";
import { logger } from "#utils/logger";
import { app } from "./app.js";
import { WebSocketService } from "#services/websocket.service";

let PORT = config.server.port;
export const server = http.createServer(app);

const getMessage = (port) => `
================================================
Server Application Started!
API V1: http://${config.server.hostname}:${port}
API Docs: http://${config.server.hostname}:${port}/docs
QUEUE Docs: http://${config.server.hostname}:${port}/queue
================================================
`;

// Attempt MongoDB/Redis connection (non-blocking)
mongoConnection(startServer);
redisConnection();

app.use(RequestLogger);

let wsAttached = false;

function startServer(port) {
	server.listen(port, () => {
		logger.info(`Server is running on port ${port}`);
		if (!wsAttached) {
			WebSocketService.getInstance().attach(server);
			wsAttached = true;
		}
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
