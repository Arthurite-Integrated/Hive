import { logger } from "../utils/logger.js";
import { connect } from "mongoose";
import { env } from "#config/env";

export const mongoConnection = async (callback) => {
  try {
    logger.info("Connecting to MongoDB", env.MONGO_URI);
    await connect(env.MONGO_URI, {
      timeoutMS: 30000,
    });
    logger.info("Connected to MongoDB");
    await callback(env.PORT);
  } catch(e) {
    logger.error("Error connecting to MongoDB", e.message);
  }
}