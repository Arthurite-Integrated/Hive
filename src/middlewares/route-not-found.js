import { throwNotFoundError } from "#helpers/errors/throw-error";

export const routeNotFound = (req, res, next) => {
  throwNotFoundError(`Route ${req.method} ${req.url} does not exist`);
};
