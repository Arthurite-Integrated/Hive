import { JwtAction } from "#enums/auth/index";
import { EmailJobNames } from "#enums/queue/index";
import { UserTypes } from "#enums/user.enums";
import { generateAuthenticatedData } from "#helpers/auth/index";
import { throwBadRequestError, throwUnauthorizedError } from "#helpers/errors/throw-error";
import { getInstructorByEmail } from "#helpers/instructor/index";
import { getParentByEmail } from "#helpers/parent/index";
import { getStudentByEmail } from "#helpers/student/index";
import { Instructor } from "#models/instructor.model";
import { Parent } from "#models/parent.model";
import { Student } from "#models/student.model";
import { InstructorService } from "#modules/instructor/services/instructor.service";
import { ParentService } from "#modules/parent/services/parent.service";
import { StudentService } from "#modules/student/services/student.service";
import { CacheService } from "#services/cache.service";
import { EncryptionService } from "#services/encryption.service";
import { JwtService } from "#services/jwt.service";
import { EmailQueueService } from "#services/queues/email.queue.service";
import _ from "lodash";
import { GoogleOAuthService } from "./oauth/google.oauth.service.js";

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
    /** Services */
    this.instructorService = InstructorService.getInstance();
    this.parentService = ParentService.getInstance();
    this.studentService = StudentService.getInstance();

    this.emailQueueService = EmailQueueService.getInstance();
    this.jwtService = JwtService.getInstance();
    this.encryptionService = EncryptionService.getInstance();
    this.cacheService = CacheService.getInstance();

    this.googleOAuthService = GoogleOAuthService.getInstance();
    
    /** Models */
    this.instructorModel = Instructor;
    this.parentModel = Parent;
    this.studentModel = Student;
  }

  registerInstructor = async (data) => {
    return this.instructorService.register(data);
  }

  loginInstructor = async (data) => {
    return this.instructorService.login(data)
  }

  registerParent = async (data) => {
    return this.parentService.register(data);
  }

  loginParent = async (data) => {
    return this.parentService.login(data);
  }

  registerStudent = async (data) => {
    return this.studentService.register(data);
  }

  loginStudent = async (data) => {
    return this.studentService.login(data);
  }

  verifyEmail = async (data, otpCode) => {
    const { authId, userType, otpId, firstName, lastName, email, action, ...rest } = data;

    const otp = await this.cacheService.get(otpId);

    if (!otp )
      throwBadRequestError("Invalid or expired verification link.");
    
    if (this.encryptionService.decrypt(otp.otp) !== otpCode)
      throwBadRequestError("Invalid code. Please try again.");

    let user;

    if (action) {
      if ( action === JwtAction.VERIFY_EMAIL ) {
        switch (userType) {
          case UserTypes.INSTRUCTOR:
            const instructor = await this.instructorModel.create({ firstName, lastName, email })
            
            console.log(this.encryptionService.decrypt(rest.password));
            await instructor.setPassword(this.encryptionService.decrypt(rest.password));
            user = instructor;
            break;
          case UserTypes.PARENT:
            const parent = await this.parentModel.create({ firstName, lastName, email })
          
            console.log(this.encryptionService.decrypt(rest.password));
            await parent.setPassword(this.encryptionService.decrypt(rest.password));
            user = parent;
            break;
          case UserTypes.STUDENT:
            const student = await this.studentModel.create({ firstName, lastName, email })
          
            console.log(this.encryptionService.decrypt(rest.password));
            await student.setPassword(this.encryptionService.decrypt(rest.password));
            user = student;
            break;
          default:
            throwUnauthorizedError("Invalid user type.")
        }
  
        user.emailVerified = true;
        user.emailVerifiedAt = new Date();
        user.lastLoginAt = new Date();
      } else if (action === JwtAction.AUTHENTICATE) {
        switch (userType) {
          case UserTypes.INSTRUCTOR:
            user = await getInstructorByEmail(email);            
            user.lastLoginAt = new Date();
            break;
          case UserTypes.PARENT:
            user = await getParentByEmail(email);            
            user.lastLoginAt = new Date();
            break;
          case UserTypes.STUDENT:
            user = await getStudentByEmail(email);            
            user.lastLoginAt = new Date();
            break;
          default:
            throwUnauthorizedError("Invalid user type.")
        }
      }
    } else {
      throwUnauthorizedError("No action found.");
    }
    
    const savedData = await user.save();
    console.log(savedData);
    user = generateAuthenticatedData(savedData.toObject());
    
    if (action === JwtAction.VERIFY_EMAIL) 
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

    await this.cacheService.deleteMany([ authId, otpId ]);

    const token = this.jwtService.generateToken(authId);

    return { token, user };
  }

  /** @info - OAuth */
  authenticateWithGoogle = async (data) => {
    return this.googleOAuthService.authenticate(data.userType, data.action);
  }

  loginWithGoogle = async (data) => {
    console.log(data)
    return this.googleOAuthService.login(data.code, data.state);
  }

  signupWithGoogle = async (data) => {
    return this.googleOAuthService.signup(data.code, data.state);
  }
}