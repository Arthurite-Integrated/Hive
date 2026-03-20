import { JwtAction } from "#enums/auth/index";
import { EmailJobNames } from "#enums/queue/index";
import { UserTypes } from "#enums/user.enums";
import {
	generateAuthenticatedData,
	generateAuthTokens,
	grabUserIdFromAuthId,
} from "#helpers/auth/index";
import { TTL } from "#constants/ttl.constant";
import {
	throwBadRequestError,
	throwUnauthorizedError,
} from "#helpers/errors/throw-error";
import { getInstructorByEmail } from "#helpers/instructor/index";
import { getParentByEmail } from "#helpers/parent/index";
import { getStudentByEmail } from "#helpers/student/index";
import { Instructor } from "#modules/instructor/instructor.model";
import { InstructorService } from "#modules/instructor/instructor.service";
import { Parent } from "#modules/parent/parent.model";
import { ParentService } from "#modules/parent/parent.service";
import { Student } from "#modules/student/student.model";
import { StudentService } from "#modules/student/student.service";
import { CacheService } from "#services/cache.service";
import { EncryptionService } from "#services/encryption.service";
import { JwtService } from "#services/jwt.service";
import { EmailQueueService } from "#services/queues/email.queue.service";
import { FacebookOAuthService } from "./oauth/facebook.oauth.service.js";
import { GoogleOAuthService } from "./oauth/google.oauth.service.js";

export class AuthService {
	static instance = null;

	/** @returns {AuthService} */
	static getInstance() {
		if (!AuthService.instance) {
			AuthService.instance = new AuthService();
		}
		return AuthService.instance;
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
		this.facebookOAuthService = FacebookOAuthService.getInstance();

		/** Models */
		this.instructorModel = Instructor;
		this.parentModel = Parent;
		this.studentModel = Student;
	}

	register = async (data) => {
		switch (data.userType) {
			case UserTypes.INSTRUCTOR:
				return this.instructorService.register(data);
			case UserTypes.PARENT:
				return this.parentService.register(data);
			case UserTypes.STUDENT:
				return this.studentService.register(data);
			default:
				throwBadRequestError(`Invalid user type: ${data.userType}`);
		}
	};

	login = async (data) => {
		switch (data.userType) {
			case UserTypes.INSTRUCTOR:
				return this.instructorService.login(data);
			case UserTypes.PARENT:
				return this.parentService.login(data);
			case UserTypes.STUDENT:
				return this.studentService.login(data);
			default:
				throwBadRequestError(`Invalid user type: ${data.userType}`);
		}
	};

	refresh = async (refreshToken) => {
		const { authId, refreshId } = this.jwtService.verifyToken(refreshToken);
		if (!refreshId) throwUnauthorizedError("Invalid refresh token.");

		if (!(await this.cacheService.redis.exists(refreshId)))
			throwBadRequestError("Refresh token expired.");
		console.log("Auth ID from refresh token:", refreshId);
		await this.cacheService.delete(refreshId);

		const token = await generateAuthTokens(authId);
		return token;
	};

	/**
	 * @info - Delete's refresh token from redis so the user wouldn't be able to use it to generate new access tokens. Effectively logs the user out.
	 * @param {string} refreshToken - The refresh token to be invalidated.
	 * @param {*} refreshToken
	 */
	logout = async (refreshToken) => {
		const { refreshId, authId } = this.jwtService.verifyToken(refreshToken);
		if (refreshId) {
			await this.cacheService.deleteMany([refreshId, authId]);
		}
	};

	logoutAll = async (refreshToken) => {
		const { refreshId } = this.jwtService.verifyToken(refreshToken);
		if (!refreshId) return;

		const userId = grabUserIdFromAuthId(refreshId);
		await this.cacheService.invalidateAllUserSessions(userId);
	};

	verifyEmail = async (data, otpCode) => {
		const { authId, userType, otpId, action, ...rest } = data;

		const otp = await this.cacheService.get(otpId);

		if (!action) throwBadRequestError("Invalid request action.");
		if (!otp) throwBadRequestError("Invalid or expired verification link.");

		if (this.encryptionService.decrypt(otp.otp) !== otpCode)
			throwBadRequestError("Invalid code. Please try again.");

		let user;

		if (action === JwtAction.VERIFY_EMAIL) {
			const { firstName, lastName, email, password } = rest;
			switch (userType) {
				case UserTypes.INSTRUCTOR: {
					const instructor = await this.instructorModel.create({
						firstName,
						lastName,
						email,
					});

					console.log(this.encryptionService.decrypt(password));
					await instructor.setPassword(
						this.encryptionService.decrypt(password),
					);
					user = instructor;
					break;
				}
				case UserTypes.PARENT: {
					const parent = await this.parentModel.create({
						firstName,
						lastName,
						email,
					});

					console.log(this.encryptionService.decrypt(password));
					await parent.setPassword(this.encryptionService.decrypt(password));
					user = parent;
					break;
				}
				case UserTypes.STUDENT: {
					const student = await this.studentModel.create({
						firstName,
						lastName,
						email,
					});

					console.log(this.encryptionService.decrypt(password));
					await student.setPassword(this.encryptionService.decrypt(password));
					user = student;
					break;
				}
				default:
					throwUnauthorizedError("Invalid user type.");
			}

			user.emailVerified = true;
			user.emailVerifiedAt = new Date();
			user.lastLoginAt = new Date();
		} else if (action === JwtAction.AUTHENTICATE) {
			const { email } = rest;
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
					throwUnauthorizedError("Invalid user type.");
			}
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

		await this.cacheService.delete(otpId);
		await this.cacheService.set(authId, user, TTL.IN_30_MINUTES);
		const gen_tokens = await generateAuthTokens(authId);

		return { user, ...gen_tokens };
	};

	/** @info - OAuth */
	authenticateWithGoogle = async (data) => {
		return this.googleOAuthService.authenticate(data.userType, data.action);
	};

	loginWithGoogle = async (data) => {
		console.log(data);
		return this.googleOAuthService.login(data.code, data.state);
	};

	signupWithGoogle = async (data) => {
		return this.googleOAuthService.signup(data.code, data.state);
	};

	/** @info - Facebook OAuth */
	authenticateWithFacebook = async (data) => {
		return this.facebookOAuthService.authenticate(data.userType, data.action);
	};

	loginWithFacebook = async (data) => {
		return this.facebookOAuthService.login(data.code, data.state);
	};

	signupWithFacebook = async (data) => {
		return this.facebookOAuthService.signup(data.code, data.state);
	};
}
