import { sendSuccessResponse } from "#helpers/responses/index";

export class BaseUserController {
	constructor(MODEL_NAME, SERVICE) {
		this.modelName = MODEL_NAME;
		this.service = SERVICE.getInstance();
	}

	#pascalize() {
		return this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1);
	}

	getProfile = async (req, res) => {
		const data = await this.service.profile(req.authData);
		return sendSuccessResponse(res, {
			message: `${this.#pascalize()} profile fetched successfully`,
			data,
		});
	};

	update = async (req, res) => {
		const data = await this.service.update(req.authData, req.body);
		return sendSuccessResponse(res, {
			message: `${this.#pascalize()} profile updated successfully`,
			data,
		});
	};

	updatePassword = async (req, res) => {
		const { currentPassword, newPassword } = req.body;
		await this.service.updatePassword(
			req.authData,
			currentPassword,
			newPassword,
		);
		return sendSuccessResponse(res, {
			message:
				"Password updated successfully. All other sessions have been logged out.",
		});
	};

	updateAvatar = async (req, res) => {
		const { avatarUrl } = req.body;
		const data = await this.service.updateAvatar(req.authData, avatarUrl);
		return sendSuccessResponse(res, {
			message: `${this.#pascalize()} avatar updated successfully`,
			data,
		});
	};

	delete = async (req, res) => {
		await this.service.delete(req.authData);
		return sendSuccessResponse(res, {
			message: `${this.#pascalize()} deleted successfully`,
		});
	};
}
