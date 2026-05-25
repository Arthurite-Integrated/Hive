import { TTL } from "#constants/ttl.constant";
import { AuthMethods } from "#enums/auth/index";
import {
	generateAuthenticatedData,
	generateAuthId,
	generateAuthTokens,
} from "#helpers/auth/index";
import { throwBadRequestError } from "#helpers/errors/throw-error";
import { CacheService } from "#services/cache.service";
import { getUserModel } from "#utils/user-model-router";

export class SocialCompleteService {
	static instance = null;

	static getInstance() {
		if (!SocialCompleteService.instance) {
			SocialCompleteService.instance = new SocialCompleteService();
		}
		return SocialCompleteService.instance;
	}

	constructor() {
		this.cacheService = CacheService.getInstance();
	}

	complete = async (pendingSocialAuthId, userType) => {
		const pending = await this.cacheService.get(pendingSocialAuthId);
		if (!pending) {
			throwBadRequestError("Social auth session expired. Please try again.");
		}

		const { email, firstName, lastName } = pending;
		const Model = getUserModel(userType);

		const user = await Model.create({
			firstName: firstName || "User",
			lastName: lastName || "",
			email,
			emailVerified: true,
			emailVerifiedAt: new Date(),
			authMethod: pendingSocialAuthId.startsWith("google")
				? AuthMethods.GOOGLE
				: pendingSocialAuthId.startsWith("facebook")
					? AuthMethods.FACEBOOK
					: AuthMethods.APPLE,
			lastLoginAt: new Date(),
		});

		await this.cacheService.delete(pendingSocialAuthId);

		const authId = generateAuthId(user._id);
		await this.cacheService.set(
			authId,
			generateAuthenticatedData(user.toObject()),
			TTL.IN_30_MINUTES,
		);
		const tokens = await generateAuthTokens(authId);

		return { user: generateAuthenticatedData(user.toObject()), ...tokens };
	};
}
