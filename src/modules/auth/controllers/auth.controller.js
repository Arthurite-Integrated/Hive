import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import { sendSuccessResponse } from "#helpers/responses/index";
import { AuthService } from "#modules/auth/services/auth.service";

export class AuthController {
	static instance = null;

	/** @returns {AuthController} */
	static getInstance() {
		if (!AuthController.instance) {
			AuthController.instance = new AuthController();
		}
		return AuthController.instance;
	}

	/** @private */
	constructor() {
		this.authService = AuthService.getInstance();
	}

	register = async (req, res) => {
		const data = await this.authService.register({
			...req.body,
			...req.clientMetadata,
		});
		return sendSuccessResponse(
			res,
			{
				message: "Please check your email for otp code to verify your email",
				data,
			},
			StatusCodes.CREATED,
		);
	};

	login = async (req, res) => {
		const data = await this.authService.login({
			...req.body,
			...req.clientMetadata,
		});
		return sendSuccessResponse(res, {
			message: data.message,
			data: _.omit(data, ["message"]),
		});
	};

	verifyEmail = async (req, res) => {
		const data = await this.authService.verifyEmail(req.authData, req.body.otp);
		return sendSuccessResponse(
			res,
			{
				message: "Email verified successfully",
				data,
			},
			StatusCodes.OK,
		);
	};

	/**
	 * @info - OAuth
	 * */
	/* ----Google---- */
	googleOAuth = async (req, res) => {
		const data = await this.authService.authenticateWithGoogle(req.query);
		return sendSuccessResponse(
			res,
			{
				message: "Google authentication url generated successfully",
				data,
			},
			StatusCodes.OK,
		);
	};

	loginWithGoogle = async (req, res) => {
		const data = await this.authService.loginWithGoogle(req.query);
		return sendSuccessResponse(
			res,
			{
				message: "Google login successful",
				data,
			},
			StatusCodes.OK,
		);
	};

	signupWithGoogle = async (req, res) => {
		const data = await this.authService.signupWithGoogle(req.query);
		return sendSuccessResponse(
			res,
			{
				message: "Google signup successful",
				data,
			},
			StatusCodes.CREATED,
		);
	};
	/* ----Facebook---- */
	facebookOAuth = async (req, res) => {
		const data = await this.authService.authenticateWithFacebook(req.query);
		return sendSuccessResponse(
			res,
			{
				message: "Facebook authentication url generated successfully",
				data,
			},
			StatusCodes.OK,
		);
	};

	loginWithFacebook = async (req, res) => {
		const data = await this.authService.loginWithFacebook(req.query);
		return sendSuccessResponse(
			res,
			{
				message: "Facebook login successful",
				data,
			},
			StatusCodes.OK,
		);
	};
	signupWithFacebook = async (req, res) => {
		const data = await this.authService.signupWithFacebook(req.query);
		return sendSuccessResponse(
			res,
			{
				message: "Facebook signup successful",
				data,
			},
			StatusCodes.CREATED,
		);
	};
}
