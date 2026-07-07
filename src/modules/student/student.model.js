import { model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { BaseUserSchema } from "#services/bases/base.user.model";

const collectionName = ModelCollections.STUDENT;
const StudentSchema = BaseUserSchema.clone();

StudentSchema.add({
	interests: {
		type: [String],
		required: false,
	},
});

StudentSchema.pre("save", function () {
	if (!this.userType) this.userType = "student";
});

StudentSchema.virtual("fullName").get(function () {
	return `${this.firstName} ${this.lastName}`;
});

export const Student = model(collectionName, StudentSchema);
