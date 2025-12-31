import { StatusCodes } from "http-status-codes";
import { CustomError } from "#errors/CustomError";

export default class ConflictError extends CustomError {
  constructor(message) {
    super(message);
    this.statusCode = StatusCodes.CONFLICT;
  }
}

export const createConflictError = (message) =>
  new ConflictError(message);
