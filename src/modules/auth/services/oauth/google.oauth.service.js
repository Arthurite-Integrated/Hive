import { google } from "googleapis";
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

export class GoogleOAuthService extends BaseOAuthService {
	static instance = null;

	/** @private */
	constructor() {
		super();
		this.google = google;
		this.client = this.#createOAuth2Client();
		this.googleAuth = new this.google.auth.OAuth2();

		this.jwtService = JwtService.getInstance();
	}

	/** @returns {GoogleOAuthService} */
	static getInstance() {
		if (!GoogleOAuthService.instance) {
			GoogleOAuthService.instance = new GoogleOAuthService();
		}
		return GoogleOAuthService.instance;
	}

	// ── Private Helpers ─────────────────────────────────────────

	#createOAuth2Client() {
		return new google.auth.OAuth2(
			config.google.clientId,
			config.google.clientSecret,
			this.#buildRedirectUrl(),
		);
	}

	#buildRedirectUrl() {
		const base =
			config.env === "development"
				? "http://127.0.0.1:3000"
				: `https://${config.server.serverDomain}`;
		return `${base}/api/v1/auth/google/callback`;
	}

	#resolveModelAndLabel(userType) {
		const entry = USER_TYPE_MODEL_MAP[userType];
		if (!entry) throwBadRequestError("Invalid user type.");
		return entry;
	}

	async #exchangeCodeForUserInfo(code) {
		const { tokens } = await this.client.getToken(code);
		this.googleAuth.setCredentials({ access_token: tokens.access_token });
		const { data: userInfo } = await this.google
			.oauth2("v2")
			.userinfo.get({ auth: this.googleAuth });
		return { tokens, userInfo };
	}

	#buildGoogleCredentials(tokens) {
		return {
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiryDate: new Date(tokens.expiry_date),
			scope: tokens.scope,
			tokenType: tokens.token_type,
			idToken: tokens.id_token,
		};
	}

	async #finaliseSession(user) {
		user = user.toObject();
		delete user.google;
		user = generateAuthenticatedData(user);

		const gen_tokens = await generateAuthTokens(
			user._id.toString(),
			user.userType,
		);

		return { user, gen_tokens };
	}

	// ── Public API ──────────────────────────────────────────────

	getUserInfoFromAccessToken = async (accessToken) => {
		this.googleAuth.setCredentials({ access_token: accessToken });
		const { data } = await this.google
			.oauth2("v2")
			.userinfo.get({ auth: this.googleAuth });
		return data;
	};

	/**
	 * Generate Google OAuth URL. State encodes the userType.
	 */
	authenticate = async (userType) => {
		return this.client.generateAuthUrl({
			access_type: "offline",
			prompt: "consent",
			scope: [
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			],
			state: generateBase64(userType),
		});
	};

	/**
	 * Unified callback — handles both login (existing user) and signup (new user).
	 * Bloom pattern: single callback, state-encoded userType, credential-linking ready.
	 */
	callback = async (code, state) => {
		const userType = decodeBase64(state);
		const { model, label } = this.#resolveModelAndLabel(userType);

		let tokens, userInfo;
		try {
			({ tokens, userInfo } = await this.#exchangeCodeForUserInfo(code));
		} catch (err) {
			console.error("Google OAuth token exchange failed:", err);
			return oauthResponsePage({
				title: "OAuth Authentication Error",
				message: "Failed to authenticate with Google. Please try again.",
				status: "error",
				payload: { type: "oauth_error", code: "AUTHENTICATION_FAILED" },
			});
		}

		// Check if a user with this email already exists
		const existingUser = await model.findOne({ email: userInfo.email });
		let isNewUser = false;
		let user;

		if (existingUser) {
			// Existing user — must have Google authMethod to login with Google
			if (existingUser.authMethod !== AuthMethods.GOOGLE) {
				return oauthResponsePage({
					title: "Account Not Linked",
					message: `A ${label} account with this email already exists. Please login using your email and password, then link your Google account from settings.`,
					status: "error",
					payload: { type: "oauth_error", code: "ACCOUNT_NOT_LINKED" },
				});
			}

			// Update tokens and login
			existingUser.google = this.#buildGoogleCredentials(tokens);
			existingUser.lastLoginAt = new Date();
			await existingUser.save();
			user = existingUser;
		} else {
			// New user — signup via Google
			user = await model.create({
				firstName: userInfo.given_name,
				lastName: userInfo.family_name,
				email: userInfo.email,
				authMethod: AuthMethods.GOOGLE,
				profilePhoto: userInfo.picture,
				google: this.#buildGoogleCredentials(tokens),
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
