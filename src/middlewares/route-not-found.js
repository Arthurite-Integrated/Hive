import { throwNotFoundError } from "#helpers/errors/throw-error";

export const routeNotFound = (req, _res, _next) => {
	throwNotFoundError(`Route ${req.method} ${req.url} does not exist`);
};
