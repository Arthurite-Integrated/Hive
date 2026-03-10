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

export class GoogleOAuthService extends BaseOAuthService {
	static instance = null;

	/** @private */
	constructor() {
		super();
		this.google = google;
		this.googleLoginAuth = this.googleLoginAuth();
		this.googleSignupAuth = this.googleSignupAuth();
		this.googleAuth = new this.google.auth.OAuth2();

		/** @info - Models */
		this.instructorModel = Instructor;
		this.parentModel = Parent;
		this.studentModel = Student;

		/** @info - Services */
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

	googleLoginAuth = () => {
		return new google.auth.OAuth2(
			config.google.clientId,
			config.google.clientSecret,
			this.generateRedirectUrl(GoogleOAuthAction.LOGIN),
		);
	};

	googleSignupAuth = () => {
		return new google.auth.OAuth2(
			config.google.clientId,
			config.google.clientSecret,
			this.generateRedirectUrl(GoogleOAuthAction.SIGNUP),
		);
	};

	generateRedirectUrl = (action) => {
		return config.env === "development"
			? `http://127.0.0.1:3000/api/v1/auth/google/${action}/callback`
			: `https://${config.server.serverDomain}/api/v1/auth/google/${action}/callback`;
	};

	getUserInfoFromAccessToken = async (accessToken) => {
		this.googleAuth.setCredentials({ access_token: accessToken });

		const userInfo = await this.google.oauth2("v2").userinfo.get({
			auth: this.googleAuth,
		});

		return userInfo.data;
	};

	authenticate = async (userType, action) => {
		switch (action) {
			case GoogleOAuthAction.LOGIN:
				return this.googleLoginAuth.generateAuthUrl({
					access_type: "offline",
					scope: [
						"https://www.googleapis.com/auth/userinfo.email",
						"https://www.googleapis.com/auth/userinfo.profile",
					],
					state: generateBase64(userType),
				});
			case GoogleOAuthAction.SIGNUP:
				return this.googleSignupAuth.generateAuthUrl({
					access_type: "offline",
					prompt: "consent",
					scope: [
						"https://www.googleapis.com/auth/userinfo.email",
						"https://www.googleapis.com/auth/userinfo.profile",
					],
					state: generateBase64(userType),
				});
			default:
				throwBadRequestError("Invalid action.");
		}
	};

	signup = async (code, state) => {
		const userType = decodeBase64(state);
		if (!Object.values(UserTypes).includes(userType))
			throwBadRequestError("Invalid user type.");

		const authId = generateAuthId();

		let userInfo;
		let tokens;
		try {
			const result = await this.googleSignupAuth.getToken(code);
			tokens = result.tokens;
			userInfo = await this.getUserInfoFromAccessToken(tokens.access_token);
			console.log(userInfo);
		} catch (e) {
			console.log(e);
			return oauthResponsePage({
				title: "OAuth Authentication Error",
				message: "Failed to authenticate with Google. Please try again.",
				status: "error",
				payload: { type: "oauth_error", code: "AUTHENTICATION_FAILED" },
			});
		}

		let user;
		switch (userType) {
			case UserTypes.INSTRUCTOR:
				user = await this.instructorModel.findOne({ email: userInfo.email });
				if (user)
					return oauthResponsePage({
						title: "Account Already Exists",
						message:
							"An instructor account with this email already exists. Please proceed to login.",
						status: "error",
						payload: { type: "oauth_error", code: "ACCOUNT_EXISTS" },
					});

				user = await this.instructorModel.create({
					firstName: userInfo.given_name,
					lastName: userInfo.family_name,
					email: userInfo.email,
					authMethod: AuthMethods.GOOGLE,
					avatar: userInfo.picture,
				});
				break;
			case UserTypes.PARENT:
				user = await this.parentModel.findOne({ email: userInfo.email });
				if (user)
					return oauthResponsePage({
						title: "Account Already Exists",
						message:
							"A parent account with this email already exists. Please proceed to login.",
						status: "error",
						payload: { type: "oauth_error", code: "ACCOUNT_EXISTS" },
					});

				user = await this.parentModel.create({
					firstName: userInfo.given_name,
					lastName: userInfo.family_name,
					email: userInfo.email,
					authMethod: AuthMethods.GOOGLE,
					avatar: userInfo.picture,
				});
				break;
			case UserTypes.STUDENT:
				user = await this.studentModel.findOne({ email: userInfo.email });
				if (user)
					return oauthResponsePage({
						title: "Account Already Exists",
						message:
							"A student account with this email already exists. Please proceed to login.",
						status: "error",
						payload: { type: "oauth_error", code: "ACCOUNT_EXISTS" },
					});

				user = await this.studentModel.create({
					firstName: userInfo.given_name,
					lastName: userInfo.family_name,
					email: userInfo.email,
					authMethod: AuthMethods.GOOGLE,
					avatar: userInfo.picture,
				});
				break;
			default:
				throwBadRequestError("Invalid user type.");
		}

		// console.log(tokens);

		user.google = {
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			expiryDate: new Date(tokens.expiry_date),
			scope: tokens.scope,
			tokenType: tokens.token_type,
			idToken: tokens.id_token,
		};

		user.emailVerified = true;
		user.emailVerifiedAt = new Date();
		user.lastLoginAt = new Date();

		user = await user.save();

		user = user.toObject();

		// Delete google credentials from the user object before caching
		delete user.google;

		user = generateAuthenticatedData(user);

		await this.cacheService.set(authId, user, TTL.IN_30_MINUTES);
		const gen_tokens = await generateAuthTokens(authId);

		return oauthResponsePage({
			title: "Welcome to Hive 😊",
			message: `Signed in as ${user.email}`,
			status: "success",
			autoClose: true,
			payload: {
				type: "oauth_success",
				user,
				...gen_tokens,
			},
		});
	};

	login = async (code, state) => {
		const userType = decodeBase64(state);
		if (!Object.values(UserTypes).includes(userType))
			throwBadRequestError("Invalid user type.");

		let userInfo;
		try {
			const { tokens } = await this.googleLoginAuth.getToken(code);
			userInfo = await this.getUserInfoFromAccessToken(tokens.access_token);
			console.log(userInfo);
		} catch {
			return oauthResponsePage({
				title: "OAuth Authentication Error",
				message: "Failed to authenticate with Google. Please try again.",
				status: "error",
				payload: { type: "oauth_error", code: "AUTHENTICATION_FAILED" },
			});
		}

		let user;
		switch (userType) {
			case UserTypes.INSTRUCTOR:
				user = await this.instructorModel.findOne({ email: userInfo.email });
				if (!user) throwBadRequestError("Instructor not found.");
				if (user.authMethod !== AuthMethods.GOOGLE)
					return oauthResponsePage({
						title: "OAuth Account exist error",
						message:
							"Instructor is not linked with Google. Login with email credentials",
						status: "error",
						payload: { type: "oauth_error", code: "ACCOUNT_EXISTS" },
					});

				user.google.accessToken = tokens.access_token;
				user.google.refreshToken = tokens.refresh_token;
				user.google.expiryDate = new Date(tokens.expiry_date);
				user.google.scope = tokens.scope;
				user.google.tokenType = tokens.token_type;
				user.google.idToken = tokens.id_token;

				break;
			case UserTypes.PARENT:
				user = await this.parentModel.findOne({ email: userInfo.email });
				if (!user) throwBadRequestError("Parent not found.");
				if (user.authMethod !== AuthMethods.GOOGLE)
					return oauthResponsePage({
						title: "OAuth Account exist error",
						message:
							"Parent is not linked with Google. Login with email credentials",
						status: "error",
						payload: { type: "oauth_error", code: "ACCOUNT_EXISTS" },
					});

				user.google.accessToken = tokens.access_token;
				user.google.refreshToken = tokens.refresh_token;
				user.google.expiryDate = new Date(tokens.expiry_date);
				user.google.scope = tokens.scope;
				user.google.tokenType = tokens.token_type;
				user.google.idToken = tokens.id_token;

				break;
			case UserTypes.STUDENT:
				user = await this.studentModel.findOne({ email: userInfo.email });
				if (!user) throwBadRequestError("Student not found.");
				if (user.authMethod !== AuthMethods.GOOGLE)
					return oauthResponsePage({
						title: "OAuth Account exist error",
						message:
							"Student is not linked with Google. Login with email credentials",
						status: "error",
						payload: { type: "oauth_error", code: "ACCOUNT_EXISTS" },
					});

				user.google.accessToken = tokens.access_token;
				user.google.refreshToken = tokens.refresh_token;
				user.google.expiryDate = new Date(tokens.expiry_date);
				user.google.scope = tokens.scope;
				user.google.tokenType = tokens.token_type;
				user.google.idToken = tokens.id_token;

				break;
			default:
				throwBadRequestError("Invalid user type.");
		}

		user.lastLoginAt = new Date();

		user = await user.save();
		user = user.toObject();

		// Delete google credentials from the user object before caching
		delete user.google;

		user = generateAuthenticatedData(user);

		const authId = generateAuthId(user._id);
		const gen_tokens = await generateAuthTokens(authId);

		await this.cacheService.set(authId, user, TTL.IN_30_MINUTES);

		return oauthResponsePage({
			title: "Welcome Back",
			message: `Signed in as ${user.email}`,
			status: "success",
			autoClose: true,
			payload: {
				type: "oauth_success",
				user,
				...gen_tokens,
			},
		});
	};
}
