import { StatusCodes } from "http-status-codes";

export const sendSuccessResponse = (res, data, status = StatusCodes.OK) => {
	return res.status(status).json({ success: true, status, ...data });
};

export const sendErrorResponse = (
	res,
	error,
	status = StatusCodes.INTERNAL_SERVER_ERROR,
) => {
	return res.status(status).json({ success: false, status, ...error });
};
