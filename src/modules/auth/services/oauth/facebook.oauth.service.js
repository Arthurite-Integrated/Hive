import axios from "axios";
import { config } from "#config/config";
import { AuthMethods } from "#enums/auth/index";
import { UserTypes } from "#enums/user.enums";
import {
	generateAuthenticatedData,
	generateAuthTokens,
} from "#helpers/auth/index";
import { throwBadRequestError } from "#helpers/errors/throw-error";
import { decodeBase64, generateBase64 } from "#helpers/index";
import { BaseOAuthService } from "#services/bases/base.oauth.service";
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
	}

	/** @returns {FacebookOAuthService} */
	static getInstance() {
		if (!FacebookOAuthService.instance) {
			FacebookOAuthService.instance = new FacebookOAuthService();
		}
		return FacebookOAuthService.instance;
	}

	// ── Private Helpers ─────────────────────────────────────────

	#buildRedirectUrl() {
		const base =
			config.env === "development"
				? "http://localhost:3000"
				: `https://${config.server.serverDomain}`;
		return `${base}/api/v1/auth/facebook/callback`;
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

	async #exchangeCodeForUserInfo(code) {
		const tokens = await this.getAccessToken(code);
		const userInfo = await this.getUserInfoFromAccessToken(tokens.access_token);
		return { tokens, userInfo };
	}

	async #finaliseSession(user) {
		user = user.toObject();
		delete user.facebook;
		user = generateAuthenticatedData(user);

		const gen_tokens = await generateAuthTokens(
			user._id.toString(),
			user.userType,
		);

		return { user, gen_tokens };
	}

	// ── Public API ──────────────────────────────────────────────

	getAccessToken = async (code) => {
		try {
			const response = await axios.post(
				`https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`,
				{
					client_id: this.clientId,
					client_secret: this.clientSecret,
					redirect_uri: this.#buildRedirectUrl(),
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

	/**
	 * Generate Facebook OAuth URL. State encodes the userType.
	 */
	authenticate = async (userType) => {
		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: this.#buildRedirectUrl(),
			config_id: config.facebook.configId,
			response_type: "code",
			state: generateBase64(userType),
		});

		return `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${params.toString()}`;
	};

	/**
	 * Unified callback — handles both login (existing user) and signup (new user).
	 */
	callback = async (code, state) => {
		const userType = decodeBase64(state);
		const { model, label } = this.#resolveModelAndLabel(userType);

		let tokens, userInfo;
		try {
			({ tokens, userInfo } = await this.#exchangeCodeForUserInfo(code));
		} catch (err) {
			console.error("Facebook OAuth exchange failed:", err);
			return oauthResponsePage({
				title: "OAuth Authentication Error",
				message: "Failed to authenticate with Facebook. Please try again.",
				status: "error",
				payload: { type: "oauth_error", code: "AUTHENTICATION_FAILED" },
			});
		}

		// Check if a user with this email already exists
		const existingUser = await model.findOne({ email: userInfo.email });
		let isNewUser = false;
		let user;

		if (existingUser) {
			// Existing user — must have Facebook authMethod to login with Facebook
			if (existingUser.authMethod !== AuthMethods.FACEBOOK) {
				return oauthResponsePage({
					title: "Account Not Linked",
					message: `A ${label} account with this email already exists. Please login using your email and password, then link your Facebook account from settings.`,
					status: "error",
					payload: { type: "oauth_error", code: "ACCOUNT_NOT_LINKED" },
				});
			}

			// Update tokens and login
			existingUser.facebook = this.#buildFacebookCredentials(tokens);
			existingUser.lastLoginAt = new Date();
			await existingUser.save();
			user = existingUser;
		} else {
			// New user — signup via Facebook
			user = await model.create({
				firstName: userInfo.given_name,
				lastName: userInfo.family_name,
				email: userInfo.email,
				authMethod: AuthMethods.FACEBOOK,
				profilePhoto: userInfo.picture,
				facebook: this.#buildFacebookCredentials(tokens),
				emailVerified: true,
				emailVerifiedAt: new Date(),
				lastLoginAt: new Date(),
			});
			isNewUser = true;
		}

		const { user: sessionUser, gen_tokens } = await this.#finaliseSession(user);

		return oauthResponsePage({
			title: isNewUser ? "Welcome to Hive 😊" : "Welcome Back",
			message: `Signed in as ${sessionUser.email}`,
			status: "success",
			autoClose: true,
			payload: { type: "oauth_success", user: sessionUser, ...gen_tokens },
		});
	};
}
