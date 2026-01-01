import { logger } from "../utils/logger.js";
import { connect } from "mongoose";
import { config } from "#config/config";

export const mongoConnection = async (callback) => {
  try {
    logger.warn("Connecting to MongoDB", config.db.uri);
    await connect(config.db.uri, {
      timeoutMS: 30000,
    });
    logger.info("Connected to MongoDB ☘️");
    await callback(config.server.port);
  } catch(e) {
    logger.error("Error connecting to MongoDB", e.message);
  }
}