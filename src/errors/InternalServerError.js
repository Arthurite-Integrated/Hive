import { StatusCodes } from "http-status-codes";
import { CustomError } from "#errors/CustomError";

export default class InternalServerError extends CustomError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  }
}

export const createInternalServerError = (message) =>
  new InternalServerError(message);
