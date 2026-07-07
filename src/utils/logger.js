import path from "node:path";
import chalk from "chalk";
import { createLogger, format, transports } from "winston";
import { LoggerLevels } from "../enums/utils/logger/index.js";

const colorize = format.printf(({ level, message, timestamp }) => {
	const color =
		level === "error"
			? "red"
			: level === "warn"
				? "yellow"
				: level === "info"
					? "green"
					: level === "debug"
						? "cyan"
						: "white";
	return `${timestamp} ${chalk[color](level)}: ${chalk[color](message)}`;
});

const plainTextFormat = format.printf(({ level, message, timestamp }) => {
	return `${timestamp} ${level}: ${message}`;
});

const env = process.env.NODE_ENV || "development";
const logFileName = `${env.trim()}.combined.log`;
const errorLogFileName = `${env.trim()}.error.log`;

export const logger = createLogger({
	level: LoggerLevels.DEBUG,
	format: format.combine(format.timestamp(), format.simple()),
	transports: [
		new transports.Console({
			format: format.combine(format.timestamp(), colorize),
		}),
		new transports.File({
			filename: path.resolve(
				process.cwd(),
				env.trim() === "development" ? "src" : "dist/src",
				"logging",
				"logs",
				"errors",
				errorLogFileName,
			),
			level: LoggerLevels.ERROR,
			format: format.combine(format.timestamp(), plainTextFormat),
		}),
		new transports.File({
			filename: path.resolve(
				process.cwd(),
				env.trim() === "development" ? "src" : "dist/src",
				"logging",
				"logs",
				"global",
				logFileName,
			),
			format: format.combine(format.timestamp(), plainTextFormat),
		}),
	],
});
