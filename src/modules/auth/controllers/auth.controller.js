import { sendSuccessResponse } from "#helpers/responses/index";
import { AuthService } from "#modules/auth/services/auth.service";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";

export class AuthController {
  static instance = null;

  /** @returns {AuthController} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new AuthController();
    }
    return this.instance;
  }

  /** @private */
  constructor() {
    this.authService = AuthService.getInstance();
  }

  registerInstructor = async (req, res) => {
    const data = await this.authService.registerInstructor({
      ...req.body,
      ...req.clientMetadata,
    });
    return sendSuccessResponse(res, {
      message: "Please check your email for otp code to verify your email",
      data,
    }, StatusCodes.CREATED)
  }

  loginInstructor = async (req, res) => {
    const data = await this.authService.loginInstructor({
      ...req.body, ...req.clientMetadata
    });
    return sendSuccessResponse(res, {
      message: data.message,
      data: _.omit(data, ['message'])
    })
  }

  registerParent = async (req, res) => {
    const data = await this.authService.registerParent({
      ...req.body,
      ...req.clientMetadata,
    });
    return sendSuccessResponse(res, {
      message: "Please check your email for otp code to verify your email",
      data,
    }, StatusCodes.CREATED)
  }

  loginParent = async (req, res) => {
    const data = await this.authService.loginParent({
      ...req.body, ...req.clientMetadata
    });
    return sendSuccessResponse(res, {
      message: data.message,
      data: _.omit(data, ['message'])
    })
  }

  registerStudent = async (req, res) => {
    const data = await this.authService.registerStudent({
      ...req.body,
      ...req.clientMetadata,
    });
    return sendSuccessResponse(res, {
      message: "Please check your email for otp code to verify your email",
      data,
    }, StatusCodes.CREATED)
  }

  loginStudent = async (req, res) => {
    const data = await this.authService.loginStudent({
      ...req.body, ...req.clientMetadata
    });
    return sendSuccessResponse(res, {
      message: data.message,
      data: _.omit(data, ['message'])
    })
  }

  verifyEmail = async (req, res) => {
    const data = await this.authService.verifyEmail(req.authData, req.body.otp);
    return sendSuccessResponse(res, {
      message: "Email verified successfully",
      data,
    }, StatusCodes.OK)
  }

  /** 
   * @info - OAuth 
   * */
  /* ----Google---- */
  googleOAuth = async (req, res) => {
    const data = await this.authService.authenticateWithGoogle(req.query);
    return sendSuccessResponse(res, {
      message: "Google authentication url generated successfully",
      data,
    }, StatusCodes.OK)
  }

  loginWithGoogle = async (req, res) => {
    const data = await this.authService.loginWithGoogle(req.query);
    return sendSuccessResponse(res, {
      message: "Google login successful",
      data,
    }, StatusCodes.OK)
  }

  signupWithGoogle = async (req, res) => {
    const data = await this.authService.signupWithGoogle(req.query);
    return sendSuccessResponse(res, {
      message: "Google signup successful",
      data,
    }, StatusCodes.CREATED)
  }
}