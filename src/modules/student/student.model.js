import { model, Schema } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { BaseUserSchema } from "#services/bases/base.user.model";

const collectionName = ModelCollections.STUDENT;
const StudentSchema = BaseUserSchema.clone();

StudentSchema.add({
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
	},
});

StudentSchema.virtual("fullName").get(function () {
	return `${this.firstName} ${this.lastName}`;
});

StudentSchema.methods.setPassword = BaseUserSchema.methods.setPassword;
StudentSchema.methods.validatePassword =
	BaseUserSchema.methods.validatePassword;

export const Student = model(collectionName, StudentSchema);
