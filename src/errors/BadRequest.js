import { StatusCodes } from "http-status-codes";
import { CustomError } from "#errors/CustomError";

export default class BadRequestError extends CustomError {
	constructor(message) {
		super(message);
		this.statusCode = StatusCodes.BAD_REQUEST;
	}
}

export const createBadRequestError = (message) => new BadRequestError(message);
