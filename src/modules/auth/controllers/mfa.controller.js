import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { MfaService } from "#modules/auth/services/mfa.service";

export class MfaController {
	static instance = null;

	static getInstance() {
		if (!MfaController.instance) {
			MfaController.instance = new MfaController();
		}
		return MfaController.instance;
	}

	constructor() {
		this.mfaService = MfaService.getInstance();
	}

	enable = async (req, res) => {
		const data = await this.mfaService.enable(req.user);
		return sendSuccessResponse(
			res,
			{ message: "Scan the QR code with your authenticator app.", data },
			StatusCodes.OK,
		);
	};

	verifySetup = async (req, res) => {
		const data = await this.mfaService.verifySetup(req.user, req.body.code);
		return sendSuccessResponse(
			res,
			{ message: "MFA enabled. Save your recovery codes.", data },
			StatusCodes.OK,
		);
	};

	login = async (req, res) => {
		const { mfaToken, code, recoveryCode } = req.body;
		const data = await this.mfaService.login(mfaToken, code, recoveryCode);

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
				message: "MFA verification successful.",
				data: { user: data.user, accessToken: data.accessToken },
			},
			StatusCodes.OK,
		);
	};

	disable = async (req, res) => {
		await this.mfaService.disable(req.user, req.body.code);
		return res.status(StatusCodes.NO_CONTENT).end();
	};
}
