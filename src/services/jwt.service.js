import jwt from "jsonwebtoken";
import { config } from "#config/config";
import { JwtAction } from "#enums/auth/index";
import { throwUnauthorizedError } from "#helpers/errors/throw-error";
import { CacheService } from "#services/cache.service";

export class JwtService {
	static instance = null;

	/** @returns {JwtService} */
	static getInstance() {
		if (!JwtService.instance) {
			JwtService.instance = new JwtService();
		}
		return JwtService.instance;
	}

	/** @private */
	constructor() {
		this.cacheService = CacheService.getInstance();
	}

	generateToken = (authId, expiresIn) => {
		return jwt.sign({ authId }, config.jwt.privateKey, {
			expiresIn: expiresIn || config.jwt.expiresIn,
			issuer: config.jwt.issuer,
			algorithm: "RS256",
		});
	};

	generateTokenFromPayload = (payload, expiresIn) => {
		return jwt.sign(payload, config.jwt.privateKey, {
			expiresIn: expiresIn || config.jwt.expiresIn,
			issuer: config.jwt.issuer,
			algorithm: "RS256",
		});
	};

	verifyToken = (token) => {
		return jwt.verify(token, config.jwt.publicKey, {
			algorithms: ["RS256"],
		});
	};

	extractTokenFromHeader = (req) => {
		const [type, token] = req.headers.authorization?.split(" ") || [];
		return type === "Bearer" ? token : undefined;
	};

	validateToken = async (req, _res, next) => {
		try {
			const token = this.extractTokenFromHeader(req);
			if (!token) {
				throwUnauthorizedError(
					"Token not found. Please ensure Bearer token is provided.",
				);
			}

			const decoded = this.verifyToken(token);

			const data = await this.cacheService.get(decoded.authId);
			if (!data) throwUnauthorizedError("Unauthorized");

			if (
				data.action &&
				!Object.values(JwtAction).includes(data.action) &&
				!data.isAuthenticated
			) {
				throwUnauthorizedError("Something went wrong,");
			}

			req.authData = data;
			next();
		} catch (e) {
			if (e instanceof jwt.JsonWebTokenError) {
				throwUnauthorizedError("Invalid or expired token");
			} else if (e instanceof jwt.TokenExpiredError) {
				throwUnauthorizedError("Token expired");
			} else {
				throwUnauthorizedError(e?.message || "Unauthorized");
			}
		}
	};
}
