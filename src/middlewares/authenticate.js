import { JwtService } from "#services/jwt.service";
import { getUserModel } from "#utils/user-model-router";
import {
	throwForbiddenError,
	throwUnauthorizedError,
} from "#helpers/errors/throw-error";

const jwtService = JwtService.getInstance();

export const authenticate = async (req, _res, next) => {
	const token = jwtService.extractTokenFromHeader(req);
	if (!token) {
		throwUnauthorizedError("Authentication required.");
	}

	let decoded;
	try {
		decoded = jwtService.verifyToken(token);
	} catch (e) {
		throwUnauthorizedError("Invalid or expired token.");
	}

	if (!decoded.userId || !decoded.userType) {
		throwUnauthorizedError("Invalid token payload.");
	}

	const Model = getUserModel(decoded.userType);
	const user = await Model.findById(decoded.userId).select(
		"-salt -hash -mfaSecret -mfaRecoveryCodes",
	);
	if (!user || user.status === "deleted") {
		throwUnauthorizedError("Account not found or deactivated.");
	}
	req.user = user;
	req.userType = decoded.userType;
	return next();
};

export const requireRole = (...roles) => {
	return (req, _res, next) => {
		if (!req.user) {
			throwUnauthorizedError("Authentication required.");
		}
		if (!roles.includes(req.user.userType)) {
			throwForbiddenError("You do not have permission to perform this action.");
		}
		next();
	};
};
