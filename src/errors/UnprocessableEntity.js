import { StatusCodes } from "http-status-codes";
import { CustomError } from "#errors/CustomError";

export default class UnprocessableEntityError extends CustomError {
	constructor(message) {
		super(message);
		this.statusCode = StatusCodes.UNPROCESSABLE_ENTITY;
	}
}
export const createUnprocessableEntityError = (message) =>
	new UnprocessableEntityError(message);
