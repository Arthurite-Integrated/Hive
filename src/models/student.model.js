import { Schema, model } from "mongoose";

const collectionName = ModelCollections.USER;

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
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters long"],
    maxlength: [100, "Password must be less than 100 characters"],
  },
  avatar: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
  versionKey: false,
  virtuals: true,
});

export const Student = model(collectionName, StudentSchema);