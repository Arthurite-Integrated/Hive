import { model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { BaseUserSchema } from "#services/bases/base.user.model";

const collectionName = ModelCollections.PARENT;
const ParentSchema = BaseUserSchema.clone();

ParentSchema.add({
	"preferences.progressReport": {
		type: String,
		enum: ["weekly", "monthly"],
		default: "weekly",
	},
});

ParentSchema.virtual("fullName").get(function () {
	return `${this.firstName} ${this.lastName}`;
});

ParentSchema.pre("save", function () {
	if (!this.userType) this.userType = "parent";
});

export const Parent = model(collectionName, ParentSchema);
