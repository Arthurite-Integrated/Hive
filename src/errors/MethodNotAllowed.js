import { StatusCodes } from "http-status-codes";
import { CustomError } from "#errors/CustomError";

export default class MethodNotAllowedError extends CustomError {
	constructor(message) {
		super(message);
		this.statusCode = StatusCodes.METHOD_NOT_ALLOWED;
	}
}

export const createMethodNotAllowedError = (message) =>
	new MethodNotAllowedError(message);
