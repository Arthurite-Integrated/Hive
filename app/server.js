import express from "express";
import http from "http";
import { env } from "#config/env";
import { mongoConnection } from "#connection/mongo.connection";
import { logger } from "#utils/logger";

const message = `
================================================
Server Application Started!
API V1: http://${env.HOSTNAME}:${env.PORT}
API Docs: http://${env.HOSTNAME}:${env.PORT}/docs
================================================
`

const app = express();
const server = http.createServer(app);

let PORT = env.PORT;

function startServer(port) {
  server.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
    console.log(message)
  })
}

// Attempt MongoDB connection (non-blocking)
mongoConnection(startServer);

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to Hive Api ' })
})

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`Port ${PORT} is already in use changing to ${PORT + 1}`);
    startServer(PORT + 1);
  } else {
    console.log(`Error: ${error.message}`);
  }
})