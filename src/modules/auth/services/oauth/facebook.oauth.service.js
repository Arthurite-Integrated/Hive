import axios from "axios";
import { BaseOAuthService } from "#services/bases/base.oauth.service";
import { config } from "#config/config";
import { decodeBase64, generateBase64 } from "#helpers/index";
import { UserTypes } from "#enums/user.enums";
import { throwBadRequestError } from "#helpers/errors/throw-error";
import { Instructor } from "#models/instructor.model";
import { Parent } from "#models/parent.model";
import { Student } from "#models/student.model";
import { AuthMethods, FacebookOAuthAction } from "#enums/auth/index";
import { JwtService } from "#services/jwt.service";
import { generateAuthenticatedData, generateAuthId } from "#helpers/auth/index";
import { TTL } from "#constants/ttl.constant";
import { CacheService } from "#services/cache.service";

export class FacebookOAuthService extends BaseOAuthService {
  static instance = null;

  /** @private */
  constructor() {
    super();
    
    this.clientId = config.facebook.clientId;
    this.clientSecret = config.facebook.clientSecret;
    this.scope = "email,public_profile";
    this.graphApiVersion = "v18.0";

    /** @info - Models */
    this.instructorModel = Instructor;
    this.parentModel = Parent;
    this.studentModel = Student;

    /** @info - Services */
    this.jwtService = JwtService.getInstance();
    this.cacheService = CacheService.getInstance();
  }

  /** @returns {FacebookOAuthService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new FacebookOAuthService();
    }
    return this.instance;
  }

  generateRedirectUrl = (action) => {
    return config.env === "development" ?
      `http://localhost:3000/api/v1/auth/facebook/${action}/callback` :
      `https://${config.server.serverDomain}/api/v1/auth/facebook/${action}/callback`;
  }

  /**
   * Get Facebook access token from authorization code
   */
  getAccessToken = async (code, action) => {
    try {
      const redirectUri = this.generateRedirectUrl(action);
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirectUri,
        code,
      });

      const response = await axios.get(
        `https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      console.error("Facebook token exchange error:", error.response?.data);
      throwBadRequestError(
        error.response?.data?.error?.message || "Failed to get Facebook access token"
      );
    }
  }

  /**
   * Get user info from Facebook using access token
   */
  getUserInfoFromAccessToken = async (accessToken) => {
    try {
      const fields = "id,email,first_name,last_name,picture.type(large)";
      const response = await axios.get(
        `https://graph.facebook.com/${this.graphApiVersion}/me?fields=${fields}&access_token=${accessToken}`
      );

      const userInfo = response.data;

      if (!userInfo.email) {
        throwBadRequestError("Email not provided by Facebook. Please ensure email permission is granted.");
      }

      return {
        id: userInfo.id,
        email: userInfo.email,
        given_name: userInfo.first_name,
        family_name: userInfo.last_name,
        picture: userInfo.picture?.data?.url,
      };
    } catch (error) {
      console.error("Facebook user info error:", error.response?.data);
      throwBadRequestError(
        error.response?.data?.error?.message || "Failed to fetch Facebook user profile"
      );
    }
  }

  /**
   * Generate Facebook OAuth URL
   */
  authenticate = async (userType, action) => {
    const redirectUri = this.generateRedirectUrl(action);
    const state = generateBase64(userType);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: this.scope,
      response_type: "code",
      state,
    });

    switch (action) {
      case FacebookOAuthAction.LOGIN:
        return `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${params.toString()}`;
      case FacebookOAuthAction.SIGNUP:
        params.append("auth_type", "rerequest");
        return `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${params.toString()}`;
      default:
        throwBadRequestError("Invalid action.");
    }
  }

  /**
   * Handle Facebook OAuth signup
   */
  signup = async (code, state) => {
    const userType = decodeBase64(state);
    if (!Object.values(UserTypes).includes(userType)) throwBadRequestError("Invalid user type.");
    
    const authId = generateAuthId();
    const token = this.jwtService.generateToken(authId);

    // Exchange code for access token
    const tokens = await this.getAccessToken(code, FacebookOAuthAction.SIGNUP);
    const userInfo = await this.getUserInfoFromAccessToken(tokens.access_token);
    
    const facebookCredentials = {
      accessToken: tokens.access_token,
      tokenType: tokens.token_type,
      expiresDate: tokens.expires_in || 0,
    };

    let user;
    switch (userType) {
      case UserTypes.INSTRUCTOR:
        user = await this.instructorModel.findOne({ email: userInfo.email });
        if (user) throwBadRequestError("Instructor already exists. Please proceed to login.");
        
        user = await this.instructorModel.create({
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          email: userInfo.email,
          authMethod: AuthMethods.FACEBOOK,
          avatar: userInfo.picture,
          facebook: facebookCredentials,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        });
        break;
      case UserTypes.PARENT:
        user = await this.parentModel.findOne({ email: userInfo.email });
        if (user) throwBadRequestError("Parent already exists. Please proceed to login.");

        user = await this.parentModel.create({
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          email: userInfo.email,
          authMethod: AuthMethods.FACEBOOK,
          avatar: userInfo.picture,
          facebook: facebookCredentials,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        });
        break;
      case UserTypes.STUDENT:
        user = await this.studentModel.findOne({ email: userInfo.email });
        if (user) throwBadRequestError("Student already exists. Please proceed to login.");

        user = await this.studentModel.create({
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          email: userInfo.email,
          authMethod: AuthMethods.FACEBOOK,
          avatar: userInfo.picture,
          facebook: facebookCredentials,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        });
        break;
      default:
        throwBadRequestError("Invalid user type.");
    }

    user = user.toObject();

    // Delete facebook credentials from the user object before caching
    delete user.facebook;

    user = generateAuthenticatedData(user);

    await this.cacheService.set(authId, user, TTL.IN_30_MINUTES);

    return { user, token };
  }

  /**
   * Handle Facebook OAuth login
   */
  login = async (code, state) => {
    const userType = decodeBase64(state);
    if (!Object.values(UserTypes).includes(userType)) throwBadRequestError("Invalid user type.");

    // Exchange code for access token
    const tokens = await this.getAccessToken(code, FacebookOAuthAction.LOGIN);
    const userInfo = await this.getUserInfoFromAccessToken(tokens.access_token);

    const authId = generateAuthId();
    const token = this.jwtService.generateToken(authId);

    let user;
    switch (userType) {
      case UserTypes.INSTRUCTOR:
        user = await this.instructorModel.findOne({ email: userInfo.email });
        if (!user) throwBadRequestError("Instructor not found.");
        if (user.authMethod !== AuthMethods.FACEBOOK) throwBadRequestError("Instructor is not linked with Facebook. Login with email credentials");

        user.facebook = {
          accessToken: tokens.access_token,
          tokenType: tokens.token_type,
          expiresDate: tokens.expires_in || 0,
        };
        break;

      case UserTypes.PARENT:
        user = await this.parentModel.findOne({ email: userInfo.email });
        if (!user) throwBadRequestError("Parent not found.");
        if (user.authMethod !== AuthMethods.FACEBOOK) throwBadRequestError("Parent is not linked with Facebook. Login with email credentials");

        user.facebook = {
          accessToken: tokens.access_token,
          tokenType: tokens.token_type,
          expiresDate: tokens.expires_in || 0,
        };
        break;

      case UserTypes.STUDENT:
        user = await this.studentModel.findOne({ email: userInfo.email });
        if (!user) throwBadRequestError("Student not found.");
        if (user.authMethod !== AuthMethods.FACEBOOK) throwBadRequestError("Student is not linked with Facebook. Login with email credentials");

        user.facebook = {
          accessToken: tokens.access_token,
          tokenType: tokens.token_type,
          expiresDate: tokens.expires_in || 0,
        };
        break;

      default:
        throwBadRequestError("Invalid user type.");
    }
      
    user.lastLoginAt = new Date();

    user = await user.save();
    user = user.toObject();

    // Delete facebook credentials from the user object before caching
    delete user.facebook;
    
    user = generateAuthenticatedData(user);

    await this.cacheService.set(authId, user, TTL.IN_30_MINUTES);

    return { user, token };
  }
}