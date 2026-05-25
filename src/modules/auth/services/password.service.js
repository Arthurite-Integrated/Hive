import { webcrypto } from "crypto";
import { TTL } from "#constants/ttl.constant";
import { EmailJobNames } from "#enums/queue/index";
import { throwBadRequestError } from "#helpers/errors/throw-error";
import { CacheService } from "#services/cache.service";
import { EmailQueueService } from "#services/queues/email.queue.service";
import { findUserByEmail } from "#utils/user-model-router";

export class PasswordService {
	static instance = null;

	static getInstance() {
		if (!PasswordService.instance) {
			PasswordService.instance = new PasswordService();
		}
		return PasswordService.instance;
	}

	constructor() {
		this.cacheService = CacheService.getInstance();
		this.emailQueueService = EmailQueueService.getInstance();
	}

	forgotPassword = async (email) => {
		const user = await findUserByEmail(email);
		if (!user) return;

		const otp = String(webcrypto.getRandomValues(new Uint32Array(1))[0])
			.slice(0, 6)
			.padStart(6, "0");

		await this.cacheService.set(
			`reset-otp:${email}`,
			{ otp, attempts: 0 },
			TTL.IN_10_MINUTES,
		);

		this.emailQueueService.add(EmailJobNames.VERIFY_OTP, {
			message: { to: email, subject: "Reset your password" },
			template: "reset-password",
			locals: { otp, name: user.firstName, expiryMinutes: 10 },
		});
	};

	resetPassword = async (email, otp, newPassword) => {
		const cached = await this.cacheService.get(`reset-otp:${email}`);
		if (!cached) {
			throwBadRequestError("Reset code expired. Please request a new one.");
		}

		if (cached.attempts >= 5) {
			await this.cacheService.delete(`reset-otp:${email}`);
			throwBadRequestError("Too many attempts. Please request a new code.");
		}

		if (cached.otp !== otp) {
			cached.attempts += 1;
			await this.cacheService.set(
				`reset-otp:${email}`,
				cached,
				TTL.IN_10_MINUTES,
			);
			throwBadRequestError("Invalid code.");
		}

		const user = await findUserByEmail(email);
		if (!user) throwBadRequestError("Account not found.");

		await user.setPassword(newPassword);
		await user.save();

		await this.cacheService.delete(`reset-otp:${email}`);
		await this.#invalidateAllRefreshTokens(user._id);
	};

	async #invalidateAllRefreshTokens(userId) {
		let cursor = "0";
		do {
			const [nextCursor, keys] = await this.cacheService.redis.scan(
				cursor,
				"MATCH",
				`refresh:${userId}-*`,
				"COUNT",
				100,
			);
			cursor = nextCursor;
			if (keys.length > 0) {
				await this.cacheService.redis.del(...keys);
			}
		} while (cursor !== "0");
	}
}
