import { StatusCodes } from "http-status-codes";
import { CustomError } from "#errors/CustomError";

export default class UnsupportedMediaType extends CustomError {
	constructor(message) {
		super(message);
		this.statusCode = StatusCodes.UNSUPPORTED_MEDIA_TYPE;
	}
}

export const createUnsupportedMediaType = (message) =>
	new UnsupportedMediaType(message);
