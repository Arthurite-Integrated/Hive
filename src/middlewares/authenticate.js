import { JwtService } from "#services/jwt.service";
import { CacheService } from "#services/cache.service";
import { getUserModel } from "#utils/user-model-router";
import {
	throwForbiddenError,
	throwUnauthorizedError,
} from "#helpers/errors/throw-error";

const jwtService = JwtService.getInstance();
const cacheService = CacheService.getInstance();

export const authenticate = async (req, _res, next) => {
	const token = jwtService.extractTokenFromHeader(req);
	if (!token) {
		throwUnauthorizedError("Authentication required.");
	}

	const decoded = jwtService.verifyToken(token);

	// New token format: { userId, userType }
	if (decoded.userId && decoded.userType) {
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
	}

	// Legacy token format: { authId } — look up user from Redis cache
	if (decoded.authId) {
		const cached = await cacheService.get(decoded.authId);
		if (!cached || !cached.isAuthenticated) {
			throwUnauthorizedError("Session expired.");
		}

		// Determine userType: check cached data, then look up from DB
		const userType = cached.userType;
		if (!userType || userType === "email") {
			const { findUserByEmail } = await import("#utils/user-model-router");
			const foundUser = await findUserByEmail(cached.email);
			if (!foundUser) throwUnauthorizedError("Account not found.");
			req.user = foundUser;
			req.userType = foundUser.userType || foundUser.constructor.modelName;
			return next();
		}

		const Model = getUserModel(userType);
		const user = await Model.findById(cached._id).select(
			"-salt -hash -mfaSecret -mfaRecoveryCodes",
		);
		if (!user || user.status === "deleted") {
			throwUnauthorizedError("Account not found or deactivated.");
		}
		req.user = user;
		req.userType = userType;
		return next();
	}

	throwUnauthorizedError("Invalid token payload.");
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
