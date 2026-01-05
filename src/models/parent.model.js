import { BYTE_LENGTH } from "#constants/auth/password-hash";
import { emailRegex, phoneNumberRegex } from "#constants/regex.constant";
import { AuthMethods } from "#enums/auth/index";
import { ModelCollections } from "#enums/models/index";
import { LINK_STATUS } from "#enums/parent/index";
import { UserTypes } from "#enums/user.enums";
import { compare, genSalt, hash } from "bcryptjs";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.PARENT;

const ParentSchema = new Schema({
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
    default: UserTypes.PARENT,
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
        return this.authMethod === 'facebook';
      },
      'Facebook credentials are required.'
    ]
  },

  /* Linked students settings */
  linkedStudents: [{
    studentId: {
      type: Schema.Types.ObjectId,
      ref: ModelCollections.STUDENT,
      required: true,
    },
    status: {
      type: String,
      enum: { 
        values: Object.values(LINK_STATUS),
        message: "Invalid link status: {{VALUE}}" 
      },
      default: LINK_STATUS.PENDING,
      required: [true, "Link status is required"],
    },
    linkedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      required: false
    }
  }],

  /* Settings */
}, {
  timestamps: true,
  versionKey: false,
  virtuals: true,
});

ParentSchema.methods.setPassword = async function (password) {
  const salt = await genSalt(BYTE_LENGTH);
  this.salt = salt;
  this.hash = await hash(password, salt);
  this.passwordChangedAt = new Date();
  return this;
}

ParentSchema.methods.validatePassword = async function (password) {
  if (!this.salt || !this.hash) return false;
  return compare(password, this.hash);
}

export const Parent = model(collectionName, ParentSchema);