import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { SocialCompleteService } from "#modules/auth/services/social-complete.service";

export class SocialCompleteController {
	static instance = null;

	static getInstance() {
		if (!SocialCompleteController.instance) {
			SocialCompleteController.instance = new SocialCompleteController();
		}
		return SocialCompleteController.instance;
	}

	constructor() {
		this.service = SocialCompleteService.getInstance();
	}

	complete = async (req, res) => {
		const { pendingSocialAuthId, userType } = req.body;
		const data = await this.service.complete(pendingSocialAuthId, userType);

		if (data.refreshToken) {
			res.cookie("refreshToken", data.refreshToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "strict",
				path: "/api/v1/auth",
				maxAge: 7 * 24 * 60 * 60 * 1000,
			});
		}

		return sendSuccessResponse(
			res,
			{
				message: "Account created successfully.",
				data: { user: data.user, accessToken: data.accessToken },
			},
			StatusCodes.CREATED,
		);
	};
}
