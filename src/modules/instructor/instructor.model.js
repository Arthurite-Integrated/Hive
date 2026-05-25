import { model } from "mongoose";
import { TeachingModes } from "#enums/instructor/index";
import { ModelCollections } from "#enums/models/index";
import { BaseUserSchema } from "#services/bases/base.user.model";

const collectionName = ModelCollections.INSTRUCTOR;

const InstructorSchema = BaseUserSchema.clone();

InstructorSchema.add({
	/** @info - Onboarding details */
	specializations: {
		type: [String],
		required: false,
	},

	gradeExperienceLevels: {
		type: [String],
		required: false,
	},

	yearsOfExperience: {
		type: Number,
		required: false,
	},

	teachingMode: {
		type: [String],
		enum: {
			values: Object.values(TeachingModes),
			message: "Invalid teaching mode: {{VALUE}}",
		},
		required: false,
	},
});

InstructorSchema.virtual("fullName").get(function () {
	return `${this.firstName} ${this.lastName}`;
});

InstructorSchema.pre("save", function () {
	if (!this.userType) this.userType = "instructor";
});

export const Instructor = model(collectionName, InstructorSchema);
