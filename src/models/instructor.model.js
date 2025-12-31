import { BYTE_LENGTH } from "#constants/auth/password-hash";
import { emailRegex } from "#constants/regex.constant";
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
  }
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
  return compare(password, this.hash, this.salt);
}

export const Instructor = model(collectionName, InstructorSchema);