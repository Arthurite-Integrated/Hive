import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { createConflictError } from "#errors/Conflict";
import CustomError from "#errors/CustomError";
import { logger } from "#utils/logger";

export const globalErrorHandler = (err, _req, res, _next) => {
	logger.error(err);
	if (err instanceof CustomError) {
		return sendErrorResponse(
			res,
			{
				message: err.message,
				status: err.statusCode,
				errors: err.errors,
			},
			StatusCodes.INTERNAL_SERVER_ERROR,
		);
	}

	return sendErrorResponse(
		res,
		{
			message: err.message,
			status: err.statusCode,
			errors: err.errors,
		},
		StatusCodes.INTERNAL_SERVER_ERROR,
	);
};

function isCustomError(error) {
	return typeof error === "object" && "statusCode" in error;
}

export const errorHandler = (err, _req, res, _next) => {
	const errorObject = {};
	console.log("Caught error:", err);

	if (err instanceof CustomError && isCustomError(err)) {
		errorObject.status = err?.statusCode;
		errorObject.message = err.message;
	}
	if (err && err.name === "ValidationError") {
		errorObject.status = StatusCodes.BAD_REQUEST;
		errorObject.message = err.message.split(": ").pop();
	}
	// Handle duplicate key errors (MongoDB E11000)
	// MongooseError wraps MongoServerError in cause property, so check both
	if (err && (err.code === 11000 || err.cause?.code === 11000)) {
		const mongoError = err.cause || err;
		const message = Object.keys(mongoError.keyValue || {}).join(", ");
		const newConflictError = createConflictError(`${message} already exist`);
		errorObject.status = newConflictError.statusCode;
		errorObject.message = newConflictError.message;
	}
	if (
		err &&
		(err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
	) {
		errorObject.message = /malformed|algorithm/.test(err.message)
			? "Invalid token"
			: "Session expired";
		errorObject.status = StatusCodes.UNAUTHORIZED;
	}
	if (err && err.name === "CastError") {
		errorObject.message = `${err?.value} is not a valid ${err?.kind}`;
		errorObject.status = StatusCodes.BAD_REQUEST;
	}
	if (err && err.name === "BSONError") {
		errorObject.status = StatusCodes.BAD_REQUEST;
		errorObject.message = err?.message || ReasonPhrases.BAD_REQUEST;
	}
	if (
		err &&
		(err.type === "entity.parse.failed" || err.name === "SyntaxError")
	) {
		errorObject.status = err?.statusCode || err?.status;
		errorObject.message = err?.message?.includes("JSON")
			? "Invalid JSON format in the request body. Please ensure there are no trailing commas."
			: "Syntax Error: Invalid data format.";
	}

	if (err && err.name === "MulterError") {
		errorObject.status = StatusCodes.UNPROCESSABLE_ENTITY;
		errorObject.message = `${err?.message} ${err.field}`;
	}

	const status = errorObject?.status || StatusCodes.INTERNAL_SERVER_ERROR;

	logger.error(errorObject?.message || ReasonPhrases.INTERNAL_SERVER_ERROR);

	logger.silly(
		`${JSON.stringify(
			{
				status,
				message: errorObject?.message || ReasonPhrases.INTERNAL_SERVER_ERROR,
				stack: err?.stack,
			},
			undefined,
			2,
		)}`,
	);

	return res.status(status).json({
		success: false,
		status,
		message:
			errorObject?.message ||
			err?.message ||
			ReasonPhrases.INTERNAL_SERVER_ERROR,
	});
};
