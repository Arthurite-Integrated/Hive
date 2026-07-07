import { StatusCodes } from "http-status-codes";
import { PasswordService } from "#modules/auth/services/password.service";

export class PasswordController {
	static instance = null;

	static getInstance() {
		if (!PasswordController.instance) {
			PasswordController.instance = new PasswordController();
		}
		return PasswordController.instance;
	}

	constructor() {
		this.passwordService = PasswordService.getInstance();
	}

	forgotPassword = async (req, res) => {
		await this.passwordService.forgotPassword(req.body.email);
		return res.status(StatusCodes.NO_CONTENT).end();
	};

	resetPassword = async (req, res) => {
		const { email, otp, newPassword } = req.body;
		await this.passwordService.resetPassword(email, otp, newPassword);
		return res.status(StatusCodes.NO_CONTENT).end();
	};
}
