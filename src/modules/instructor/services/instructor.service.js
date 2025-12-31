import { AUTH_LOGIN_TYPES } from "#constants/auth/auth";
import { TTL } from "#constants/ttl.constant";
import { EmailJobNames } from "#enums/queue/index";
import { UserTypes } from "#enums/user.enums";
import { generateAuthId, generateOTP, generateOTPId } from "#helpers/auth/index";
import { throwBadRequestError, throwUnauthorizedError } from "#helpers/errors/throw-error";
import { getInstructorByEmail } from "#helpers/instructor/index";
import { Instructor } from "#models/instructor.model";
import { CacheService } from "#services/cache.service";
import { EncryptionService } from "#services/encryption.service";
import { JwtService } from "#services/jwt.service";
import { EmailQueueService } from "#services/queues/email.queue.service";
import { v4 } from "uuid";
import { uuidv4 } from "zod";

export class InstructorService {
  static instance = null;

  /** @returns {InstructorService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new InstructorService();
    }
    return this.instance;
  }

  /** @private */
  constructor() {
    this.instructorModel = Instructor;
    this.cacheService = CacheService.getInstance();
    this.emailQueueService = EmailQueueService.getInstance();
    this.jwtService = JwtService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
  }

  generateCacheKey = () => {
    return `instructor:${v4()}-${Date.now()}`;
  }

  register = async (data) => {
    if ( await this.instructorModel.findOne({ email: data.email }) ) throwBadRequestError("Email already exists");

    console.log(data);
    const authId = generateAuthId();
    const otpId = generateOTPId();
    const otp = generateOTP();

    const cacheData = {
      authId,
      otpId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      userType: UserTypes.INSTRUCTOR,
      password: this.encryptionService.encrypt(data.password),
    }

    await Promise.all([
      this.cacheService.set(authId, cacheData, TTL.IN_30_MINUTES),
      this.cacheService.set(otpId, { otp: this.encryptionService.encrypt(otp) }, TTL.IN_30_MINUTES),
    ]);

    this.emailQueueService.add(EmailJobNames.VERIFY_OTP, {
      message: {
        to: data.email,
        subject: "Verify your email",
      },
      template: "verify-otp",
      locals: {
        otp,
        name: data.firstName,
        expiryMinutes: TTL.IN_30_MINUTES / 60,
        timestamp: new Date().toISOString(),
        ipAddress: data.ipAddress,
        location: data.location,
        userAgent: data.userAgent,
      }
    });

    const token = this.jwtService.generateToken(authId);

    return { token };
  }

  login = async (data) => {
    const { email, password, loginType } = data;

    const instructor = await getInstructorByEmail(email);

    switch (loginType) {
      case AUTH_LOGIN_TYPES.PASSWORD:
        if (!password) throwValidationError("Password is required");
        const isPasswordValid = await instructor.validatePassword(password);
        if (!isPasswordValid) throwValidationError("Invalid password");
        break;
      case AUTH_LOGIN_TYPES.OTP:
        const otp = generateOTP();

        await this.emailQueueService.add(EmailJobNames.VERIFY_OTP, {
          message: {
            to: instructor.email,
          },
          template: "verify-otp",
          locals: {
            otp: otp,
            name: instructor.firstName,
            timestamp: new Date().toISOString(),
            location: "",
            userAgent: ""
          },
        });
    }

  }
}