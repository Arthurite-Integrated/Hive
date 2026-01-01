import { emailRegex } from "#constants/regex.constant";
import { ModelCollections } from "#enums/models/index";
import { UserTypes } from "#enums/user.enums";
import { Schema, model } from "mongoose";
import { compare, genSalt, hash } from "bcryptjs";
import { BYTE_LENGTH } from "#constants/auth/password-hash";

const collectionName = ModelCollections.STUDENT;

const StudentSchema = new Schema({
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
  userType: {
    type: String,
    enum: Object.values(UserTypes),
    default: UserTypes.STUDENT,
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

  /* Parent Relationship fields */
  linkedParent: {
    type: Schema.Types.ObjectId,
    ref: ModelCollections.PARENT,
    required: false,
  },
  linkedAt: {
    type: Date,
    required: false,
  },
  unlinkedAt: {
    type: Date,
    required: false,
  }
}, {
  timestamps: true,
  versionKey: false,
  virtuals: true,
});

StudentSchema.methods.setPassword = async function (password) {
  const salt = await genSalt(BYTE_LENGTH);
  this.salt = salt;
  this.hash = await hash(password, salt);
  this.passwordChangedAt = new Date();
  return this;
}

StudentSchema.methods.validatePassword = async function (password) {
  if (!this.salt || !this.hash) return false;
  return compare(password, this.hash);
}

export const Student = model(collectionName, StudentSchema);