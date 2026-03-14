import axios from "axios";
import { config } from "#config/config";
import { TTL } from "#constants/ttl.constant";
import { AuthMethods, FacebookOAuthAction } from "#enums/auth/index";
import { UserTypes } from "#enums/user.enums";
import {
	generateAuthenticatedData,
	generateAuthId,
	generateAuthTokens,
} from "#helpers/auth/index";
import { throwBadRequestError } from "#helpers/errors/throw-error";
import { decodeBase64, generateBase64 } from "#helpers/index";
import { BaseOAuthService } from "#services/bases/base.oauth.service";
import { CacheService } from "#services/cache.service";
import { JwtService } from "#services/jwt.service";
import { Instructor } from "#modules/instructor/instructor.model";
import { Parent } from "#modules/parent/parent.model";
import { Student } from "#modules/student/student.model";
import { oauthResponsePage } from "#helpers/auth/oauth.helper";

const USER_TYPE_MODEL_MAP = {
	[UserTypes.INSTRUCTOR]: { model: Instructor, label: "instructor" },
	[UserTypes.PARENT]: { model: Parent, label: "parent" },
	[UserTypes.STUDENT]: { model: Student, label: "student" },
};

export class FacebookOAuthService extends BaseOAuthService {
	static instance = null;

	/** @private */
	constructor() {
		super();

		this.clientId = config.facebook.clientId;
		this.clientSecret = config.facebook.clientSecret;
		this.scope = "email,public_profile";
		this.graphApiVersion = "v18.0";

		this.jwtService = JwtService.getInstance();
		this.cacheService = CacheService.getInstance();
	}

	/** @returns {FacebookOAuthService} */
	static getInstance() {
		if (!FacebookOAuthService.instance) {
			FacebookOAuthService.instance = new FacebookOAuthService();
		}
		return FacebookOAuthService.instance;
	}

	// ── Private Helpers ─────────────────────────────────────────

	#buildRedirectUrl(action) {
		const base =
			config.env === "development"
				? "http://localhost:3000"
				: `https://${config.server.serverDomain}`;
		return `${base}/api/v1/auth/facebook/${action}/callback`;
	}

	#resolveModelAndLabel(userType) {
		const entry = USER_TYPE_MODEL_MAP[userType];
		if (!entry) throwBadRequestError("Invalid user type.");
		return entry;
	}

	#buildFacebookCredentials(tokens) {
		return {
			accessToken: tokens.access_token,
			tokenType: tokens.token_type,
			expiresDate: tokens.expires_in || 0,
		};
	}

	async #exchangeCodeForUserInfo(code, action) {
		const tokens = await this.getAccessToken(code, action);
		const userInfo = await this.getUserInfoFromAccessToken(tokens.access_token);
		return { tokens, userInfo };
	}

	async #finaliseSession(user) {
		user = user.toObject();
		delete user.facebook;
		user = generateAuthenticatedData(user);

		const authId = generateAuthId(user._id);
		const gen_tokens = await generateAuthTokens(authId);
		await this.cacheService.set(authId, user, TTL.IN_30_MINUTES);

		return { user, gen_tokens };
	}

	// ── Public API ──────────────────────────────────────────────

	getAccessToken = async (code, action) => {
		try {
			const response = await axios.post(
				`https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`,
				{
					client_id: this.clientId,
					client_secret: this.clientSecret,
					redirect_uri: this.#buildRedirectUrl(action),
					code,
				},
			);

			return response.data;
		} catch (error) {
			console.error("Facebook token exchange error:", error.response?.data);
			throwBadRequestError(
				error.response?.data?.error?.message ||
					"Failed to get Facebook access token",
			);
		}
	};

	getUserInfoFromAccessToken = async (accessToken) => {
		try {
			const fields = "id,email,first_name,last_name,picture.type(large)";
			const response = await axios.get(
				`https://graph.facebook.com/${this.graphApiVersion}/me`,
				{
					params: {
						fields,
						access_token: accessToken,
					},
				},
			);

			const userInfo = response.data;

			if (!userInfo.email) {
				throwBadRequestError(
					"Email not provided by Facebook. Please ensure email permission is granted.",
				);
			}

			return {
				id: userInfo.id,
				email: userInfo.email,
				given_name: userInfo.first_name,
				family_name: userInfo.last_name,
				picture: userInfo.picture?.data?.url,
			};
		} catch (error) {
			console.error("Facebook user info error:", error.response?.data);
			throwBadRequestError(
				error.response?.data?.error?.message ||
					"Failed to fetch Facebook user profile",
			);
		}
	};

	authenticate = async (userType, action) => {
		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: this.#buildRedirectUrl(action),
			// scope: this.scope,
			config_id: config.facebook.configId,
			response_type: "code",
			state: generateBase64(userType),
		});

		if (action === FacebookOAuthAction.SIGNUP) {
			params.append("auth_type", "rerequest");
		} else if (action !== FacebookOAuthAction.LOGIN) {
			throwBadRequestError("Invalid action.");
		}

		return `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${params.toString()}`;
	};

	signup = async (code, state) => {
		const userType = decodeBase64(state);
		const { model, label } = this.#resolveModelAndLabel(userType);

		let tokens, userInfo;
		try {
			({ tokens, userInfo } = await this.#exchangeCodeForUserInfo(
				code,
				FacebookOAuthAction.SIGNUP,
			));
		} catch (err) {
			console.error(err);
			return oauthResponsePage({
				title: "OAuth Authentication Error",
				message: "Failed to authenticate with Facebook. Please try again.",
				status: "error",
				payload: { type: "oauth_error", code: "AUTHENTICATION_FAILED" },
			});
		}

		const existing = await model.findOne({ email: userInfo.email });
		if (existing) {
			return oauthResponsePage({
				title: "Account Already Exists",
				message: `A ${label} account with this email already exists. Please proceed to login.`,
				status: "error",
				payload: { type: "oauth_error", code: "ACCOUNT_EXISTS" },
			});
		}

		const user = await model.create({
			firstName: userInfo.given_name,
			lastName: userInfo.family_name,
			email: userInfo.email,
			authMethod: AuthMethods.FACEBOOK,
			avatar: userInfo.picture,
			facebook: this.#buildFacebookCredentials(tokens),
			emailVerified: true,
			emailVerifiedAt: new Date(),
			lastLoginAt: new Date(),
		});

		const { user: sessionUser, gen_tokens } = await this.#finaliseSession(user);

		return oauthResponsePage({
			title: "Welcome to Hive 😊",
			message: `Signed in as ${sessionUser.email}`,
			status: "success",
			autoClose: true,
			payload: { type: "oauth_success", user: sessionUser, ...gen_tokens },
		});
	};

	login = async (code, state) => {
		const userType = decodeBase64(state);
		const { model, label } = this.#resolveModelAndLabel(userType);

		let tokens, userInfo;
		try {
			({ tokens, userInfo } = await this.#exchangeCodeForUserInfo(
				code,
				FacebookOAuthAction.LOGIN,
			));
		} catch (err) {
			console.error(err);
			return oauthResponsePage({
				title: "OAuth Authentication Error",
				message: "Failed to authenticate with Facebook. Please try again.",
				status: "error",
				payload: { type: "oauth_error", code: "AUTHENTICATION_FAILED" },
			});
		}

		const user = await model.findOne({ email: userInfo.email });

		if (!user) {
			return oauthResponsePage({
				title: "Account Not Found",
				message: `No ${label} account found with this email. Please sign up first.`,
				status: "error",
				payload: { type: "oauth_error", code: "ACCOUNT_NOT_FOUND" },
			});
		}

		if (user.authMethod !== AuthMethods.FACEBOOK) {
			return oauthResponsePage({
				title: "OAuth Account Error",
				message: `This ${label} account is not linked with Facebook. Login with email credentials.`,
				status: "error",
				payload: { type: "oauth_error", code: "ACCOUNT_EXISTS" },
			});
		}

		user.facebook = this.#buildFacebookCredentials(tokens);
		user.lastLoginAt = new Date();
		await user.save();

		const { user: sessionUser, gen_tokens } = await this.#finaliseSession(user);

		return oauthResponsePage({
			title: "Welcome Back",
			message: `Signed in as ${sessionUser.email}`,
			status: "success",
			autoClose: true,
			payload: { type: "oauth_success", user: sessionUser, ...gen_tokens },
		});
	};
}
