import { model, Schema } from "mongoose";
import { COMMUNITY_STATUS, COMMUNITY_VISIBILITY } from "#enums/community/index";

const collectionName = ModelCollections.COMMUNITY;

const CommunitySchema = new Schema(
	{
		name: {
			type: String,
			required: [true, "Name is required"],
		},
		description: {
			type: String,
			required: false,
		},
		slug: {
			type: String,
			required: [true, "Slug is required"],
			unique: [true, "Slug must be unique"],
		},
		image: {
			type: String,
			required: false,
		},
		coverImage: {
			type: String,
			required: false,
		},
		ownerId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.INSTRUCTOR,
			required: [true, "Owner ID is required"],
		},
		category: {
			type: String,
			required: [true, "Category is required"],
		},
		status: {
			type: String,
			enum: {
				values: Object.values(COMMUNITY_STATUS),
				message: "Invalid status: {{VALUE}}",
			},
			default: COMMUNITY_STATUS.ACTIVE,
		},
		visibility: {
			type: String,
			enum: {
				values: Object.values(COMMUNITY_VISIBILITY),
				message: "Invalid visibility: {{VALUE}}",
			},
			default: COMMUNITY_VISIBILITY.PUBLIC,
		},

		// Settings
		requireApproval: {
			type: Boolean,
			default: false,
		},
		allowInvites: {
			type: Boolean,
			default: true,
		},

		/**
		 * @info - Denormalized stats @todo - Might remove this later if we have a better way to get these stats */
		memberCount: {
			type: Number,
			default: 0,
		},
		courseCount: {
			type: Number,
			default: 0,
		},
	},
	{
		timestamps: true,
		versionKey: false,
		virtuals: true,
	},
);

export const Community = model(collectionName, CommunitySchema);
