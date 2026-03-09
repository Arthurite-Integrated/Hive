import { model, Schema } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { LINK_STATUS } from "#enums/parent/index";
import { BaseUserSchema } from "#services/bases/base.user.model";

const collectionName = ModelCollections.PARENT;
const ParentSchema = BaseUserSchema.clone();

ParentSchema.add({
	/* Linked students settings */
	linkedStudents: [
		{
			studentId: {
				type: Schema.Types.ObjectId,
				ref: ModelCollections.STUDENT,
				required: true,
			},
			status: {
				type: String,
				enum: {
					values: Object.values(LINK_STATUS),
					message: "Invalid link status: {{VALUE}}",
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
				required: false,
			},
		},
	],
});

ParentSchema.virtual("fullName").get(function () {
	return `${this.firstName} ${this.lastName}`;
});

ParentSchema.methods.setPassword = BaseUserSchema.methods.setPassword;
ParentSchema.methods.validatePassword = BaseUserSchema.methods.validatePassword;

export const Parent = model(collectionName, ParentSchema);
