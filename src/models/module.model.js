import { ModelCollections } from "#enums/models/index";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.MODULE;

const ModuleSchema = new Schema(
	{
		courseId: {
			type: Schema.Types.ObjectId,
			ref: "Course",
			required: true,
		},
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		orderIndex: {
			type: Number,
			required: true,
			default: 0,
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	},
);

// Compound index for ordered retrieval by course
ModuleSchema.index({ courseId: 1, orderIndex: 1 });

// Soft delete index
ModuleSchema.index({ isDeleted: 1 });

export const Module = model(collectionName, ModuleSchema);
