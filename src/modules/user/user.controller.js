import { sendSuccessResponse } from "#helpers/responses/index";
import { UserService } from "./user.service.js";

export class UserController {
	static instance = null;

	static getInstance() {
		if (!UserController.instance) {
			UserController.instance = new UserController();
		}
		return UserController.instance;
	}

	constructor() {
		this.userService = UserService.getInstance();
	}

	getProfile = async (req, res) => {
		const data = this.userService.profile(req.user);
		return sendSuccessResponse(res, {
			message: "Profile fetched successfully",
			data,
		});
	};

	update = async (req, res) => {
		const data = await this.userService.update(req.user, req.body);
		return sendSuccessResponse(res, {
			message: "Profile updated successfully",
			data,
		});
	};

	getAvatarUploadUrl = async (req, res) => {
		const { contentType } = req.query;
		const data = await this.userService.getAvatarUploadUrl(
			req.user,
			contentType,
		);
		return sendSuccessResponse(res, {
			message: "Upload URL generated",
			data,
		});
	};

	finalizeAvatar = async (req, res) => {
		const { key } = req.body;
		const { user, avatarUrl } = await this.userService.finalizeAvatar(
			req.user,
			key,
		);
		return sendSuccessResponse(res, {
			message: "Avatar updated successfully",
			data: { user, avatarUrl },
		});
	};

	onboard = async (req, res) => {
		const data = await this.userService.onboard(req.user, req.body);
		return sendSuccessResponse(res, {
			message: "Onboarding complete",
			data,
		});
	};

	delete = async (req, res) => {
		await this.userService.delete(req.user);
		return sendSuccessResponse(res, {
			message: "Account deleted successfully",
		});
	};

	// GET /users/me/streak
	getStreak = async (req, res) => {
		const data = await this.userService.getStreak(req.user);
		return sendSuccessResponse(res, { data });
	};

	// GET /users/search?q=&limit=
	search = async (req, res) => {
		const { q = "", limit } = req.query;
		const data = await this.userService.search(
			req.user._id,
			q,
			limit ? parseInt(limit, 10) : 10,
		);
		return sendSuccessResponse(res, { data });
	};
}
