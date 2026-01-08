import { Model } from "mongoose";
import { v4 } from "uuid";
import { AUTH_LOGIN_TYPES } from "#constants/auth/auth";
import { TTL } from "#constants/ttl.constant";
import { JwtAction } from "#enums/auth/index";
import { EmailJobNames } from "#enums/queue/index";
import { UserTypes } from "#enums/user.enums";
import {
	generateAuthenticatedData,
	generateAuthId,
	generateOTP,
	generateOTPId,
} from "#helpers/auth/index";
import {
	throwBadRequestError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { CacheService } from "#services/cache.service";
import { EncryptionService } from "#services/encryption.service";
import { JwtService } from "#services/jwt.service";
import { EmailQueueService } from "#services/queues/email.queue.service";

export class BaseUserService {
	static instance = null;

	/** @returns {BaseUserService} */
	static getInstance() {
		if (!BaseUserService.instance) {
			BaseUserService.instance = new BaseUserService();
		}
		return BaseUserService.instance;
	}

	/** @private
	 * @param {UserTypes} MODEL_NAME
	 * @param {Model} DB_MODEL
	 */
	constructor(MODEL_NAME, DB_MODEL) {
		this.modelName = MODEL_NAME;
		this.dbModel = DB_MODEL;
		this.cacheService = CacheService.getInstance();
		this.emailQueueService = EmailQueueService.getInstance();
		this.jwtService = JwtService.getInstance();
		this.encryptionService = EncryptionService.getInstance();
	}

	generateCacheKey = () => {
		return `${this.modelName}:${v4()}-${Date.now()}`;
	};

	register = async (data) => {
		if (await this.dbModel.findOne({ email: data.email }))
			throwBadRequestError("Email already exists");

		console.log(data);
		const authId = generateAuthId();
		const otpId = generateOTPId();
		const otp = generateOTP();

		const cacheData = {
			authId,
			otpId,
			firstName: data.firstName,
			lastName: data.lastName,
			email: data.email,
			action: JwtAction.VERIFY_EMAIL,
			userType: this.modelName,
			password: this.encryptionService.encrypt(data.password),
		};

		await Promise.all([
			this.cacheService.set(authId, cacheData, TTL.IN_30_MINUTES),
			this.cacheService.set(
				otpId,
				{ otp: this.encryptionService.encrypt(otp) },
				TTL.IN_30_MINUTES,
			),
		]);

		this.emailQueueService.add(EmailJobNames.VERIFY_OTP, {
			message: {
				to: data.email,
				subject: "Verify your email",
			},
			template: "verify-otp",
			locals: {
				otp,
				name: data.firstName,
				expiryMinutes: TTL.IN_30_MINUTES / 60,
				timestamp: new Date().toISOString(),
				ipAddress: data.ipAddress,
				location: data.location,
				userAgent: data.userAgent,
			},
		});

		const token = this.jwtService.generateToken(authId);

		return { token };
	};

	login = async (data) => {
		const { email, password, loginType } = data;

		let user =
			(await this.dbModel.findOne({ email })) ??
			throwNotFoundError(
				`${this.modelName[0].toUpperCase() + this.modelName.slice(1)} not found`,
			);
		const authId = generateAuthId();
		const token = this.jwtService.generateToken(authId);

		console.log(authId);

		let response;

		switch (loginType) {
			case AUTH_LOGIN_TYPES.PASSWORD: {
				if (!password) throwBadRequestError("Password is required");

				const isPasswordValid = await user.validatePassword(password);

				if (!isPasswordValid) throwBadRequestError("Invalid password");

				await this.cacheService.set(
					authId,
					generateAuthenticatedData(user.toObject()),
				);

				user.lastLoginAt = new Date();
				user = await user.save();

				response = {
					message: "Login successful",
					user: generateAuthenticatedData(user.toObject()),
					token,
				};
				break;
			}
			case AUTH_LOGIN_TYPES.OTP: {
				const otp = generateOTP();
				const otpId = generateOTPId();

				const cacheData = {
					authId,
					otpId,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
					action: JwtAction.AUTHENTICATE,
					userType: this.modelName,
					password: this.encryptionService.encrypt(data.password),
				};

				await Promise.all([
					this.cacheService.set(authId, cacheData, TTL.IN_30_MINUTES),
					this.cacheService.set(
						otpId,
						{ otp: this.encryptionService.encrypt(otp) },
						TTL.IN_30_MINUTES,
					),
				]);

				await this.emailQueueService.add(EmailJobNames.VERIFY_OTP, {
					message: {
						to: user.email,
					},
					template: "verify-otp",
					locals: {
						otp,
						expiryMinutes: TTL.IN_30_MINUTES / 60,
						name: user.firstName,
						timestamp: new Date().toISOString(),
						location: data.location,
						userAgent: data.userAgent,
						ipAddress: data.ipAddress,
					},
				});

				await this.cacheService.set(authId, cacheData);

				response = {
					message: "An otp has being sent to your email.",
					token,
				};
				break;
			}
		}

		return response;
	};
}
