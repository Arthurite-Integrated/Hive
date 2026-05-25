import { v4 as uuid } from "uuid";
import { config } from "#config/config";
import { UserTypes } from "#enums/user.enums";
import {
	throwBadRequestError,
	throwNotFoundError,
} from "#helpers/errors/throw-error";
import { BaseUserService } from "#services/bases/base.user.service";
import { S3Service } from "#services/s3.service";
import { getUserModel } from "#utils/user-model-router";
import { LearningStreak } from "#models/enrollment/learning-streak.model";

const ALLOWED_IMAGE_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
]);

export class UserService {
	static instance = null;

	/** @returns {UserService} */
	static getInstance() {
		if (!UserService.instance) {
			UserService.instance = new UserService();
		}
		return UserService.instance;
	}

	constructor() {
		this.baseService = BaseUserService.getInstance();
		this.s3Service = S3Service.getInstance();
	}

	/**
	 * Returns the user object already fetched by the authenticate middleware.
	 * No extra DB call needed.
	 * @param {object} user - req.user
	 */
	profile = (user) => {
		return user;
	};

	/**
	 * Updates profile fields — role-aware: instructors may also update specializations.
	 * @param {object} user - req.user
	 * @param {object} data - validated body
	 */
	update = async (user, data) => {
		const extraFields =
			user.userType === UserTypes.INSTRUCTOR ? ["specializations"] : [];

		// Delegate to base service using the correct role model
		const Model = getUserModel(user.userType);
		const baseServiceForRole = new BaseUserService(user.userType, Model);

		return baseServiceForRole.update(user, data, extraFields);
	};

	/**
	 * Generates a presigned S3 upload URL for an avatar image.
	 * @param {object} user - req.user
	 * @param {string} contentType - MIME type from query param
	 * @returns {{ uploadUrl: string, key: string }}
	 */
	getAvatarUploadUrl = async (user, contentType) => {
		if (!contentType)
			throwBadRequestError("contentType query parameter is required");
		if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
			throwBadRequestError(
				`Content type "${contentType}" is not allowed. Accepted: ${[...ALLOWED_IMAGE_TYPES].join(", ")}`,
			);
		}

		const ext = contentType.split("/")[1]; // jpeg, png, gif, webp
		const key = `avatars/${user._id}/${uuid()}.${ext}`;

		const { url: uploadUrl } = await this.s3Service.generatePresignedUploadUrl({
			key,
			contentType,
			expiresIn: 5 * 60, // 5 minutes
		});

		return { uploadUrl, key };
	};

	/**
	 * Stores the avatar key on the user model and returns the updated user.
	 * @param {object} user - req.user
	 * @param {string} key - S3 key from the finalize request
	 * @returns {object} updated user
	 */
	finalizeAvatar = async (user, key) => {
		if (!key) throwBadRequestError("key is required");

		// Security: ensure key belongs to this user
		const expectedPrefix = `avatars/${user._id}/`;
		if (!key.startsWith(expectedPrefix)) {
			throwBadRequestError("Invalid upload key");
		}

		// Build the avatar URL — use CloudFront if configured, otherwise fall back to S3 key
		const avatarUrl = config.aws.cloudfront.domain
			? `https://${config.aws.cloudfront.domain}/${key}`
			: key;

		const Model = getUserModel(user.userType);
		const updated = await Model.findByIdAndUpdate(
			user._id,
			{ profilePhoto: key },
			{ new: true, runValidators: true },
		).select("-salt -hash -mfaSecret -mfaRecoveryCodes");

		return { user: updated, avatarUrl };
	};

	/**
	 * Unified onboard handler — delegates to the correct role-specific allowed fields.
	 * Sets onboarded: true regardless of role.
	 * @param {object} user - req.user
	 * @param {object} data - validated body
	 */
	onboard = async (user, data) => {
		const ALLOWED = {
			[UserTypes.INSTRUCTOR]: [
				"bio",
				"specializations",
				"gradeExperienceLevels",
				"yearsOfExperience",
				"teachingMode",
				"preferences",
			],
			[UserTypes.STUDENT]: ["bio", "interests", "preferences"],
			[UserTypes.PARENT]: ["bio", "preferences"],
		};

		const allowed = ALLOWED[user.userType] ?? ["preferences"];
		const filtered = Object.fromEntries(
			Object.entries(data).filter(([k]) => allowed.includes(k)),
		);

		// getUserModel throws for unknown types (e.g. super_admin). Fall back gracefully.
		let Model;
		try {
			Model = getUserModel(user.userType);
		} catch {
			throwBadRequestError(
				`Onboarding not supported for role: ${user.userType}`,
			);
		}

		const updated = await Model.findByIdAndUpdate(
			user._id,
			{ ...filtered, onboarded: true },
			{ new: true, runValidators: true },
		).select("-salt -hash -mfaSecret -mfaRecoveryCodes");

		if (!updated) throwNotFoundError("User not found");
		return updated;
	};

	/**
	 * Search for users by name or email across all role models.
	 * Excludes the requesting user and deleted accounts.
	 * @param {string} requesterId - the caller's _id (excluded from results)
	 * @param {string} q - search query
	 * @param {number} limit
	 */
	search = async (requesterId, q, limit = 10) => {
		if (!q || q.trim().length < 2) return [];

		const term = q.trim();
		const regex = new RegExp(term, "i");
		const filter = {
			_id: { $ne: requesterId },
			status: { $ne: "deleted" },
			$or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
		};

		const roleTypes = [
			UserTypes.INSTRUCTOR,
			UserTypes.STUDENT,
			UserTypes.PARENT,
		];
		const perModel = Math.ceil(limit / roleTypes.length);

		const results = await Promise.all(
			roleTypes.map((ut) =>
				getUserModel(ut)
					.find(filter)
					.select("_id firstName lastName email avatarUrl userType")
					.limit(perModel)
					.lean(),
			),
		);

		// Merge, sort by firstName, cap at limit
		return results
			.flat()
			.sort((a, b) => a.firstName.localeCompare(b.firstName))
			.slice(0, limit);
	};

	/**
	 * Get (or return zero) learning streak for the current user.
	 * Only students have streaks; all other roles get zeroed data.
	 * @param {object} user - req.user
	 */
	getStreak = async (user) => {
		if (user.userType !== UserTypes.STUDENT) {
			return {
				currentStreak: 0,
				longestStreak: 0,
				lastActivityDate: null,
				totalActiveDays: 0,
			};
		}

		const streak = await LearningStreak.findOne({ studentId: user._id }).lean();
		if (!streak) {
			return {
				currentStreak: 0,
				longestStreak: 0,
				lastActivityDate: null,
				totalActiveDays: 0,
			};
		}

		return {
			currentStreak: streak.currentStreak,
			longestStreak: streak.longestStreak,
			lastActivityDate: streak.lastActivityDate ?? null,
			totalActiveDays: streak.totalActiveDays,
		};
	};

	/**
	 * Soft-deletes the account and invalidates all tokens.
	 * @param {object} user - req.user
	 */
	delete = async (user) => {
		const Model = getUserModel(user.userType);
		const baseServiceForRole = new BaseUserService(user.userType, Model);
		return baseServiceForRole.delete(user);
	};
}
