import { model, Schema } from "mongoose";
import { ModelCollections } from "#enums/models/index";

const collectionName = ModelCollections.LOCATION;

const LocationSchema = new Schema(
	{
		address: {
			type: String,
			required: [true, "Address is required"],
		},
		city: {
			type: String,
			required: [true, "City is required"],
		},
		state: {
			type: String,
			required: [true, "State is required"],
		},
		country: {
			type: String,
			required: [true, "Country is required"],
		},
		zipCode: {
			type: String,
			required: false,
		},
		accountId: {
			type: Schema.Types.ObjectId,
			unique: true,
			sparse: true, // This allows multiple null values but ensures uniqueness for non-null values
		},
	},
	{
		timestamps: true,
		versionKey: false,
		virtuals: true,
	},
);

export const Location = model(collectionName, LocationSchema);
