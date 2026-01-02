import { google } from "googleapis";
import { BaseOAuthService } from "#services/bases/base.oauth.service";
import { config } from "#config/config";
import { decodeBase64, generateBase64 } from "#helpers/index";
import { UserTypes } from "#enums/user.enums";
import { throwBadRequestError } from "#helpers/errors/throw-error";
import { Instructor } from "#models/instructor.model";
import { Parent } from "#models/parent.model";
import { Student } from "#models/student.model";
import { AuthMethods, GoogleOAuthAction } from "#enums/auth/index";
import { JwtService } from "#services/jwt.service";
import { generateAuthenticatedData, generateAuthId } from "#helpers/auth/index";
import { TTL } from "#constants/ttl.constant";
import { CacheService } from "#services/cache.service";

export class GoogleOAuthService extends BaseOAuthService {
  static instance = null;

  /** @private */
  constructor() {
    super();
    this.google = google;
    this.googleLoginAuth = this.googleLoginAuth();
    this.googleSignupAuth = this.googleSignupAuth();
    this.googleAuth = new this.google.auth.OAuth2()

    /** @info - Models */
    this.instructorModel = Instructor;
    this.parentModel = Parent;
    this.studentModel = Student;

    /** @info - Services */
    this.jwtService = JwtService.getInstance();
    this.cacheService = CacheService.getInstance();
  }

  /** @returns {GoogleOAuthService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new GoogleOAuthService();
    }
    return this.instance;
  }

  googleLoginAuth = () => {
    return new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      this.generateRedirectUrl(GoogleOAuthAction.LOGIN)
    );
  }

  googleSignupAuth = () => {
    return new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      this.generateRedirectUrl(GoogleOAuthAction.SIGNUP)
    );
  }

  generateRedirectUrl = (action) => {
    return config.env === "development" ?
    `http://127.0.0.1:3000/api/v1/auth/google/${action}/callback` :
    `https://${config.server.serverDomain}/api/v1/auth/google/${action}/callback`;
  }

  getUserInfoFromAccessToken = async (accessToken) => {
    this.googleAuth.setCredentials({ access_token: accessToken });
    
    const userInfo = await this.google.oauth2('v2').userinfo.get({
      auth: this.googleAuth,
    });

    return userInfo.data;
  }

  authenticate = async (userType, action) => {
    switch (action) {
      case GoogleOAuthAction.LOGIN:
        return this.googleLoginAuth.generateAuthUrl({
          access_type: "offline",
          scope: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
          state: generateBase64(userType),
        });
      case GoogleOAuthAction.SIGNUP:
        return this.googleSignupAuth.generateAuthUrl({
          access_type: "offline",
          prompt: "consent",
          scope: ["https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
          state: generateBase64(userType),
        });
      default:
        throwBadRequestError("Invalid action.");
    }
  }

  signup = async (code, state) => {
    const userType = decodeBase64(state);
    if (!Object.values(UserTypes).includes(userType)) throwBadRequestError("Invalid user type.");
    
    const authId = generateAuthId();
    const token = this.jwtService.generateToken(authId);

    const { tokens } = await this.googleSignupAuth.getToken(code);
    const userInfo = await this.getUserInfoFromAccessToken(tokens.access_token);
    
    let user;
    switch (userType) {
      case UserTypes.INSTRUCTOR:
        user = await this.instructorModel.findOne({ email: userInfo.email });
        if (user) throwBadRequestError("Instructor already exists. Please proceed to login.");
        
        user = await this.instructorModel.create({
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          email: userInfo.email,
          authMethod: AuthMethods.GOOGLE,
          avatar: userInfo.picture,
         });
        break;
      case UserTypes.PARENT:
        user = await this.parentModel.findOne({ email: userInfo.email });
        if (user) throwBadRequestError("Parent already exists. Please proceed to login.");

        user = await this.parentModel.create({
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          email: userInfo.email,
          authMethod: AuthMethods.GOOGLE,
          avatar: userInfo.picture,
        });
        break;
      case UserTypes.STUDENT:
        user = await this.studentModel.findOne({ email: userInfo.email });
        if (user) throwBadRequestError("Student already exists. Please proceed to login.");

        user = await this.studentModel.create({
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          email: userInfo.email,
          authMethod: AuthMethods.GOOGLE,
          avatar: userInfo.picture,
        });
        break;
      default:
        throwBadRequestError("Invalid user type.");
    }

    console.log(tokens);

    user.google = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope,
      tokenType: tokens.token_type,
      idToken: tokens.id_token,
    }
    
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.lastLoginAt = new Date();

    user = await user.save();

    user = user.toObject();

    // Delete google credentials from the user object before caching
    delete user.google;

    user = generateAuthenticatedData(user);

    await this.cacheService.set(authId, user, TTL.IN_30_MINUTES);

    return { user, token };
  }

  login = async (code, state) => {
    const userType = decodeBase64(state);
    if (!Object.values(UserTypes).includes(userType)) throwBadRequestError("Invalid user type.");

    const { tokens } = await this.googleLoginAuth.getToken(code);
    const userInfo = await this.getUserInfoFromAccessToken(tokens.access_token);
    console.log(userInfo)

    const authId = generateAuthId();
    const token = this.jwtService.generateToken(authId);

    let user;
    switch (userType) {
      case UserTypes.INSTRUCTOR:
        user = await this.instructorModel.findOne({ email: userInfo.email });
        if (!user) throwBadRequestError("Instructor not found.");
        if (user.authMethod !== AuthMethods.GOOGLE) throwBadRequestError("Instructor is not linked with Google. Login with email credentials");

        user.google.accessToken = tokens.access_token;
        user.google.refreshToken = tokens.refresh_token;
        user.google.expiryDate = new Date(tokens.expiry_date);
        user.google.scope = tokens.scope;
        user.google.tokenType = tokens.token_type;
        user.google.idToken = tokens.id_token;

        break;
      case UserTypes.PARENT:
        user = await this.parentModel.findOne({ email: userInfo.email });
        if (!user) throwBadRequestError("Parent not found.");
        if (user.authMethod !== AuthMethods.GOOGLE) throwBadRequestError("Parent is not linked with Google. Login with email credentials");

        user.google.accessToken = tokens.access_token;
        user.google.refreshToken = tokens.refresh_token;
        user.google.expiryDate = new Date(tokens.expiry_date);
        user.google.scope = tokens.scope;
        user.google.tokenType = tokens.token_type;
        user.google.idToken = tokens.id_token;

        break;
      case UserTypes.STUDENT:
        user = await this.studentModel.findOne({ email: userInfo.email });
        if (!user) throwBadRequestError("Student not found.");
        if (user.authMethod !== AuthMethods.GOOGLE) throwBadRequestError("Student is not linked with Google. Login with email credentials");

        user.google.accessToken = tokens.access_token;
        user.google.refreshToken = tokens.refresh_token;
        user.google.expiryDate = new Date(tokens.expiry_date);
        user.google.scope = tokens.scope;
        user.google.tokenType = tokens.token_type;
        user.google.idToken = tokens.id_token;

        break;
      default:
        throwBadRequestError("Invalid user type.");
    }
      
    user.lastLoginAt = new Date();

    user = await user.save();
    user = user.toObject();

    // Delete google credentials from the user object before caching
    delete user.google;
    
    user = generateAuthenticatedData(user);

    await this.cacheService.set(authId, user, TTL.IN_30_MINUTES);

    return { user, token };
  }
}