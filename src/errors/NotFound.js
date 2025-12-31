import { StatusCodes } from "http-status-codes";
import { CustomError } from "#errors/CustomError";

export default class NotFoundError extends CustomError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.NOT_FOUND;
  }
}

export const createNotFoundError = (message) =>
  new NotFoundError(message);
