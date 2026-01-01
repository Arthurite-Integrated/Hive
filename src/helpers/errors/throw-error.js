import {
  createBadRequestError,
  createConflictError,
  createForbiddenError,
  createMethodNotAllowedError,
  createNotFoundError,
  createUnauthorizedError,
  createUnprocessableEntityError,
  createUnsupportedMediaType,
  CustomError,
} from "#errors/index";
import { ReasonPhrases } from "http-status-codes";

export const throwBadRequestError = (message) => {
  throw createBadRequestError(message);
};

export const throwConflictError = (message) => {
  throw createConflictError(message);
};

export const throwMethodNotAllowedError = (message) => {
  throw createMethodNotAllowedError(message);
};

export const throwNotFoundError = (message) => {
  throw createNotFoundError(message);
};

export const throwUnauthorizedError = (message) => {
  throw createUnauthorizedError(message);
};

export const throwUnprocessableEntityError = (message) => {
  throw createUnprocessableEntityError(message);
};

export const throwForbiddenError = (message) => {
  throw createForbiddenError(message);
};

export const throwUnsupportedMediaTypeError = (message) => {
  throw createUnsupportedMediaType(message);
};

export const throwServerError = (message) => {
  throw new CustomError(message || ReasonPhrases.INTERNAL_SERVER_ERROR);
};
