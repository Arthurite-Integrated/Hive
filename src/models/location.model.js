import { Schema, model } from "mongoose";

const collectionName = ModelCollections.LOCATION;

const LocationSchema = new Schema({
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
    required: [true, "Zip code is required"],
  }
}, {
  timestamps: true,
  versionKey: false,
  virtuals: true,
});

export const Location = model(collectionName, LocationSchema);