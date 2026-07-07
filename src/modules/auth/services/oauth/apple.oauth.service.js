import jwt from "jsonwebtoken";
import axios from "axios";
import { TTL } from "#constants/ttl.constant";
import { AuthMethods } from "#enums/auth/index";
import {
	generateAuthenticatedData,
	generateAuthId,
	generateAuthTokens,
} from "#helpers/auth/index";
import {
	throwBadRequestError,
	throwUnauthorizedError,
} from "#helpers/errors/throw-error";
import { CacheService } from "#services/cache.service";
import { findUserByEmail } from "#utils/user-model-router";

let applePublicKeys = null;
let appleKeysLastFetched = 0;

async function getApplePublicKeys() {
	if (
		applePublicKeys &&
		Date.now() - appleKeysLastFetched < 24 * 60 * 60 * 1000
	) {
		return applePublicKeys;
	}
	const { data } = await axios.get("https://appleid.apple.com/auth/keys");
	applePublicKeys = data.keys;
	appleKeysLastFetched = Date.now();
	return applePublicKeys;
}

async function _pemFromJwk(jwk) {
	const { createPublicKey } = await import("crypto");
	const key = createPublicKey({ key: jwk, format: "jwk" });
	return key.export({ type: "spki", format: "pem" });
}

export class AppleOAuthService {
	static instance = null;

	static getInstance() {
		if (!AppleOAuthService.instance) {
			AppleOAuthService.instance = new AppleOAuthService();
		}
		return AppleOAuthService.instance;
	}

	constructor() {
		this.cacheService = CacheService.getInstance();
	}

	verifyIdentityToken = async (identityToken) => {
		const decoded = jwt.decode(identityToken, { complete: true });
		if (!decoded) throwBadRequestError("Invalid Apple identity token.");

		const keys = await getApplePublicKeys();
		const matchingKey = keys.find((k) => k.kid === decoded.header.kid);
		if (!matchingKey) throwUnauthorizedError("Apple key not found.");

		const { createPublicKey } = await import("crypto");
		const publicKey = createPublicKey({ key: matchingKey, format: "jwk" });
		const pem = publicKey.export({ type: "spki", format: "pem" });

		const payload = jwt.verify(identityToken, pem, {
			algorithms: ["RS256"],
			issuer: "https://appleid.apple.com",
		});

		return payload;
	};

	login = async (identityToken, _userType, userData) => {
		const payload = await this.verifyIdentityToken(identityToken);
		const { email, sub } = payload;

		if (!email) throwBadRequestError("Email not available from Apple.");

		const user = await findUserByEmail(email);

		if (user) {
			user.lastLoginAt = new Date();
			if (!user.apple) {
				user.apple = { accessToken: sub };
				user.authMethod = AuthMethods.APPLE;
			}
			await user.save();

			const authId = generateAuthId(user._id);
			const tokens = await generateAuthTokens(user._id.toString(), user.userType);
			return { user: generateAuthenticatedData(user.toObject()), ...tokens };
		}

		// New user — need role selection
		const pendingId = `apple-pending:${sub}`;
		await this.cacheService.set(
			pendingId,
			{
				email,
				sub,
				firstName: userData?.firstName || "",
				lastName: userData?.lastName || "",
			},
			TTL.IN_15_MINUTES,
		);

		return { pendingSocialAuthId: pendingId, isNew: true };
	};
}
