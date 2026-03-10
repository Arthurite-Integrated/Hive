import { model } from "mongoose";
import { TeachingModes } from "#enums/instructor/index";
import { ModelCollections } from "#enums/models/index";
import { BaseUserSchema } from "#services/bases/base.user.model";

const collectionName = ModelCollections.INSTRUCTOR;

const InstructorSchema = BaseUserSchema.clone();

InstructorSchema.add({
	/** @info - Onboarding details */
	subjects: {
		type: [String],
		required: false,
	},

	gradeLevels: {
		type: [String],
		required: false,
	},

	yearsOfExperience: {
		type: Number,
		required: false,
	},

	preferredTeachingMode: {
		type: String,
		enum: {
			values: Object.values(TeachingModes),
			message: "Invalid teaching mode: {{VALUE}}",
		},
		required: false,
		default: "online",
		lowercase: true,
	},
});

InstructorSchema.virtual("fullName").get(function () {
	return `${this.firstName} ${this.lastName}`;
});

InstructorSchema.methods.setPassword = BaseUserSchema.methods.setPassword;
InstructorSchema.methods.validatePassword =
	BaseUserSchema.methods.validatePassword;

export const Instructor = model(collectionName, InstructorSchema);
