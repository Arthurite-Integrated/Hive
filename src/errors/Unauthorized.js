import { StatusCodes } from "http-status-codes";
import { CustomError } from "#errors/CustomError";

export default class UnauthorizedError extends CustomError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.UNAUTHORIZED;
  }
}

export const createUnauthorizedError = (message) =>
  new UnauthorizedError(message);
