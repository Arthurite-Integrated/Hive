import { EmailJobNames } from "#enums/queue/index";
import { UserTypes } from "#enums/user.enums";
import { throwBadRequestError, throwUnauthorizedError } from "#helpers/errors/throw-error";
import { Instructor } from "#models/instructor.model";
import { InstructorService } from "#modules/instructor/services/instructor.service";
import { CacheService } from "#services/cache.service";
import { EncryptionService } from "#services/encryption.service";
import { JwtService } from "#services/jwt.service";
import { EmailQueueService } from "#services/queues/email.queue.service";
import _ from "lodash";

export class AuthService {
  static instance = null;

  /** @returns {AuthService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new AuthService();
    }
    return this.instance;
  }

  /** @private */
  constructor() {
    this.instructorService = InstructorService.getInstance();
    this.emailQueueService = EmailQueueService.getInstance();
    this.jwtService = JwtService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
    this.instructorModel = Instructor;
    this.cacheService = CacheService.getInstance();
  }

  registerInstructor = async (data) => {
    return this.instructorService.register(data);
  }

  verifyEmail = async (data, otpCode) => {
    console.log(data);
    const authId = data.authId;
    const userType = data.userType;
    const otpId = data.otpId;

    console.log(authId, userType);

    const [ cachedData, otp ] = await Promise.all([
      this.cacheService.get(authId),
      this.cacheService.get(otpId),
    ]);

    if (!cachedData || !otp )
      throwBadRequestError("Invalid or expired verification link.");
    
    console.log(this.encryptionService.decrypt(otp.otp), otpCode);
    if (this.encryptionService.decrypt(otp.otp) !== otpCode)
      throwBadRequestError("Invalid code. Please try again.");

    const { firstName, lastName, email, password } = cachedData;

    let user;
    switch (userType) {
      case UserTypes.INSTRUCTOR:
        const instructor = await this.instructorModel.create({ firstName, lastName, email, password })
        
        console.log(this.encryptionService.decrypt(password));
        await instructor.setPassword(this.encryptionService.decrypt(password));
        const data = await instructor.save();
        console.log(data);
        user = _.omit(data.toObject(), ["salt", "hash"]);
        break;
      case UserTypes.PARENT:
        break;
      case UserTypes.STUDENT:
        break;
      default:
        throwUnauthorizedError("You're unauthorized.")
    }
    
    await this.emailQueueService.add(EmailJobNames.WELCOME, {
      message: {
        to: user.email,
        subject: "Welcome to the Hive",
      },
      template: "welcome",
      locals: {
        name: user.firstName,
      },
    });

    await this.cacheService.deleteMany([authId, otpId]);

    const token = this.jwtService.generateToken(authId);

    return { token, data: user };
  }
}