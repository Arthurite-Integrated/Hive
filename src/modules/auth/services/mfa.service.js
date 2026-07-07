import {
	generateSecret,
	verify as totpVerify,
	generateURI,
	NobleCryptoPlugin,
	ScureBase32Plugin,
} from "otplib";
import { compare, genSalt, hash } from "bcryptjs";
import { webcrypto } from "crypto";
import { TTL } from "#constants/ttl.constant";
import {
	generateAuthenticatedData,
	generateAuthTokens,
	generateAuthId,
} from "#helpers/auth/index";
import {
	throwBadRequestError,
	throwUnauthorizedError,
} from "#helpers/errors/throw-error";
import { CacheService } from "#services/cache.service";
import { EncryptionService } from "#services/encryption.service";
import { JwtService } from "#services/jwt.service";
import { getUserModel } from "#utils/user-model-router";

const plugins = {
	crypto: new NobleCryptoPlugin(),
	base32: new ScureBase32Plugin(),
};

export class MfaService {
	static instance = null;

	static getInstance() {
		if (!MfaService.instance) {
			MfaService.instance = new MfaService();
		}
		return MfaService.instance;
	}

	constructor() {
		this.cacheService = CacheService.getInstance();
		this.encryptionService = EncryptionService.getInstance();
		this.jwtService = JwtService.getInstance();
	}

	enable = async (user) => {
		if (user.mfaEnabled) {
			throwBadRequestError("MFA is already enabled.");
		}

		const secret = generateSecret();
		const qrCodeUrl = generateURI({
			type: "totp",
			secret,
			label: user.email,
			issuer: "Hive",
		});

		await this.cacheService.set(
			`mfa:setup:${user._id}`,
			{ secret },
			TTL.IN_10_MINUTES,
		);

		return { secret, qrCodeUrl };
	};

	verifySetup = async (user, code) => {
		const cached = await this.cacheService.get(`mfa:setup:${user._id}`);
		if (!cached?.secret) {
			throwBadRequestError("MFA setup session expired. Please start again.");
		}

		const result = await totpVerify({
			token: code,
			secret: cached.secret,
			epochTolerance: 30,
			...plugins,
		});
		if (!result.valid) {
			throwBadRequestError("Invalid code. Please try again.");
		}

		const recoveryCodes = this.#generateRecoveryCodes(10);
		const hashedCodes = await Promise.all(
			recoveryCodes.map(async (c) => {
				const salt = await genSalt(10);
				return hash(c, salt);
			}),
		);

		const encryptedSecret = this.encryptionService.encrypt(cached.secret);

		const Model = getUserModel(user.userType);
		await Model.findByIdAndUpdate(user._id, {
			mfaEnabled: true,
			mfaSecret: encryptedSecret,
			mfaRecoveryCodes: hashedCodes,
		});

		await this.cacheService.delete(`mfa:setup:${user._id}`);

		return { recoveryCodes };
	};

	login = async (mfaToken, code, recoveryCode) => {
		const decoded = this.jwtService.verifyToken(mfaToken);
		if (decoded.scope !== "mfa-pending") {
			throwUnauthorizedError("Invalid MFA token.");
		}

		const { userId, userType } = decoded;
		const Model = getUserModel(userType);
		const user = await Model.findById(userId);
		if (!user) throwUnauthorizedError("User not found.");

		if (code) {
			const secret = this.encryptionService.decrypt(user.mfaSecret);
			const result = await totpVerify({
				token: code,
				secret,
				epochTolerance: 30,
				...plugins,
			});
			if (!result.valid) throwBadRequestError("Invalid MFA code.");
		} else if (recoveryCode) {
			const matched = await this.#checkRecoveryCode(user, recoveryCode);
			if (!matched) throwBadRequestError("Invalid recovery code.");
		} else {
			throwBadRequestError("Provide either a TOTP code or a recovery code.");
		}

		user.lastLoginAt = new Date();
		await user.save();

		const tokens = await generateAuthTokens(user._id.toString(), userType);
		return {
			user: generateAuthenticatedData(user.toObject()),
			...tokens,
		};
	};

	disable = async (user, code) => {
		if (!user.mfaEnabled) {
			throwBadRequestError("MFA is not enabled.");
		}

		const Model = getUserModel(user.userType);
		const fullUser = await Model.findById(user._id).select(
			"mfaSecret mfaEnabled",
		);
		if (!fullUser?.mfaSecret) throwBadRequestError("MFA secret not found.");

		const secret = this.encryptionService.decrypt(fullUser.mfaSecret);
		const result = await totpVerify({
			token: code,
			secret,
			epochTolerance: 30,
			...plugins,
		});
		if (!result.valid) throwBadRequestError("Invalid code.");

		await Model.findByIdAndUpdate(user._id, {
			mfaEnabled: false,
			mfaSecret: null,
			mfaRecoveryCodes: [],
		});
	};

	#generateRecoveryCodes(count) {
		const codes = [];
		for (let i = 0; i < count; i++) {
			const bytes = webcrypto.getRandomValues(new Uint8Array(5));
			codes.push(
				Array.from(bytes)
					.map((b) => b.toString(36).padStart(2, "0"))
					.join("")
					.slice(0, 8)
					.toUpperCase(),
			);
		}
		return codes;
	}

	async #checkRecoveryCode(user, recoveryCode) {
		for (let i = 0; i < user.mfaRecoveryCodes.length; i++) {
			const matches = await compare(recoveryCode, user.mfaRecoveryCodes[i]);
			if (matches) {
				user.mfaRecoveryCodes.splice(i, 1);
				await user.save();
				return true;
			}
		}
		return false;
	}
}
