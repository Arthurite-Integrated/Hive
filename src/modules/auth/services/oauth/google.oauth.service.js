import { google } from "googleapis";
import { config } from "#config/config";
import { TTL } from "#constants/ttl.constant";
import { AuthMethods, GoogleOAuthAction } from "#enums/auth/index";
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

export class GoogleOAuthService extends BaseOAuthService {
	static instance = null;

	/** @private */
	constructor() {
		super();
		this.google = google;
		this.googleLoginAuth = this.#createOAuth2Client(GoogleOAuthAction.LOGIN);
		this.googleSignupAuth = this.#createOAuth2Client(GoogleOAuthAction.SIGNUP);
		this.googleAuth = new this.google.auth.OAuth2();

		this.jwtService = JwtService.getInstance();
		this.cacheService = CacheService.getInstance();
	}

	/** @returns {GoogleOAuthService} */
	static getInstance() {
		if (!GoogleOAuthService.instance) {
			GoogleOAuthService.instance = new GoogleOAuthService();
		}
		return GoogleOAuthService.instance;
	}

	// ── Private Helpers ─────────────────────────────────────────

	#createOAuth2Client(action) {
		return new google.auth.OAuth2(
			config.google.clientId,
			config.google.clientSecret,
			this.#buildRedirectUrl(action),
		);
	}

	#buildRedirectUrl(action) {
		const base =
			config.env === "development"
				? "http://127.0.0.1:3000"
				: `https://${config.server.serverDomain}`;
		return `${base}/api/v1/auth/google/${action}/callback`;
	}

	#getOAuth2ClientForAction(action) {
		if (action === GoogleOAuthAction.LOGIN) return this.googleLoginAuth;
		if (action === GoogleOAuthAction.SIGNUP) return this.googleSignupAuth;
		throwBadRequestError("Invalid action.");
	}

	#resolveModelAndLabel(userType) {
		const entry = USER_TYPE_MODEL_MAP[userType];
		if (!entry) throwBadRequestError("Invalid user type.");
		return entry;
	}

	async #exchangeCodeForUserInfo(oauthClient, code) {
		const { tokens } = await oauthClient.getToken(code);
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

		const authId = generateAuthId(user._id);
		const gen_tokens = await generateAuthTokens(authId);
		await this.cacheService.set(authId, user, TTL.IN_30_MINUTES);

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

	authenticate = async (userType, action) => {
		const client = this.#getOAuth2ClientForAction(action);
		return client.generateAuthUrl({
			access_type: "offline",
			prompt: "consent",
			scope: [
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			],
			state: generateBase64(userType),
		});
	};

	signup = async (code, state) => {
		const userType = decodeBase64(state);
		const { model, label } = this.#resolveModelAndLabel(userType);

		let tokens, userInfo;
		try {
			({ tokens, userInfo } = await this.#exchangeCodeForUserInfo(
				this.googleSignupAuth,
				code,
			));
		} catch (err) {
			console.error(err);
			return oauthResponsePage({
				title: "OAuth Authentication Error",
				message: "Failed to authenticate with Google. Please try again.",
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
			authMethod: AuthMethods.GOOGLE,
			avatar: userInfo.picture,
			google: this.#buildGoogleCredentials(tokens),
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
				this.googleLoginAuth,
				code,
			));
		} catch (err) {
			console.error(err);
			return oauthResponsePage({
				title: "OAuth Authentication Error",
				message: "Failed to authenticate with Google. Please try again.",
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

		if (user.authMethod !== AuthMethods.GOOGLE) {
			return oauthResponsePage({
				title: "OAuth Account Error",
				message: `This ${label} account is not linked with Google. Login with email credentials.`,
				status: "error",
				payload: { type: "oauth_error", code: "ACCOUNT_EXISTS" },
			});
		}

		user.google = this.#buildGoogleCredentials(tokens);
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
