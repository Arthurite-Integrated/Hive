import { BYTE_LENGTH } from "#constants/auth/password-hash";
import { emailRegex, phoneNumberRegex } from "#constants/regex.constant";
import { AuthMethods } from "#enums/auth/index";
import { ModelCollections } from "#enums/models/index";
import { UserTypes } from "#enums/user.enums";
import { compare, genSalt, hash } from "bcryptjs";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.INSTRUCTOR;

const InstructorSchema = new Schema({
  firstName: {
    type: String,
    required: [true, "First name is required"],
  },
  lastName: {
    type: String,
    required: [true, "Last name is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    match: [emailRegex, "Please enter a valid email address"],
    unique: [true, "Email already exists"],
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
    required: false,
  },
  lastLoginAt: {
    type: Date,
    required: false,
  },
  avatar: {
    type: String,
    required: false,
  },
  bio: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    required: false,
    match: [phoneNumberRegex, "Please enter a valid phone number"],
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  userType: {
    type: String,
    enum: Object.values(UserTypes),
    default: UserTypes.INSTRUCTOR,
  },
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: ModelCollections.LOCATION,
    required: false,
  },
  passwordChangedAt: {
    type: Date,
    required: false,
  },
  salt: {
    type: String,
    required: false,
  },
  hash: {
    type: String,
    required: false,
  },
  mfaEnabled: {
    type: Boolean,
    default: false,
  },
  onboarded: {
    type: Boolean,
    default: false
  },

  /** @info - OAuth */
  authMethod: {
    type: String,
    enum: Object.values(AuthMethods),
    default: AuthMethods.EMAIL,
  },
  google: {
    type: {
      accessToken: {
        type: String,
        required: [true, 'Access token is required'],
      },
      refreshToken: {
        type: String,
        required: [true, 'Refresh token is required'],
      },
      expiryDate: {
        type: Date,
        required: [true, 'Expiry date is required'],
      },
      scope: {
        type: String,
        required: [true, 'Scope is required'],
      },
      tokenType: {
        type: String,
        required: [true, 'Token type is required'],
      },
      idToken: {
        type: String,
        required: [true, 'ID token is required'],
      },
    },
    // required: [
    //   function () {
    //     return this.authMethod === AuthMethods.GOOGLE;
    //   },
    //   'Google credentials are required.'
    // ]
    // select: false,
    required: false,
  },
  facebook: {
    type: {
      accessToken: {
        type: String,
        required: [true, 'Access token is required'],
      },
      tokenType: {
        type: String,
        required: [true, 'Token type is required'],
      },
      expiresDate: {
        type: Number,
        required: [true, 'Expires in is required'],
      },
    },
    required: [
      function () {
        return this.authMethod === AuthMethods.FACEBOOK;
      },
      'Facebook credentials are required.'
    ]
  },
  apple: {
    type: {
      accessToken: {
        type: String,
        required: [true, 'Access token is required'],
      },
    },
    required: [
      function () {
        return this.authMethod === AuthMethods.APPLE;
      },
      'Apple credentials are required.'
    ]
  },
}, {
  timestamps: true,
  versionKey: false,
  virtuals: true,
});

InstructorSchema.methods.setPassword = async function (password) {
  const salt = await genSalt(BYTE_LENGTH);
  this.salt = salt;
  this.hash = await hash(password, salt);
  this.passwordChangedAt = new Date();
  return this;
}

InstructorSchema.methods.validatePassword = async function (password) {
  if (!this.salt || !this.hash) return false;
  return compare(password, this.hash);
}

export const Instructor = model(collectionName, InstructorSchema);