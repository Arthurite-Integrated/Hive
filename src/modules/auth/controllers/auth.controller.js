import { getLocationFromIP } from "#helpers/auth/index";
import { sendSuccessResponse } from "#helpers/responses/index";
import { AuthService } from "#modules/auth/services/auth.service";
import { StatusCodes } from "http-status-codes";

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
    const ipAddress = req.headers['x-forwarded-for'];
    const data = await this.authService.registerInstructor({
      ...req.body,
      ipAddress,
      location: await getLocationFromIP(ipAddress),
      userAgent: req.headers['user-agent'],
    });
    return sendSuccessResponse(res, {
      message: "Instructor registered successfully",
      data,
    }, StatusCodes.CREATED)
  }

  verifyEmail = async (req, res) => {
    const data = await this.authService.verifyEmail(req.authData, req.body.otp);
    return sendSuccessResponse(res, {
      message: "Email verified successfully",
      data,
    }, StatusCodes.OK)
  }
}