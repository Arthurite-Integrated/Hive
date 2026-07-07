import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";

const PostLikeSchema = new Schema(
	{
		postId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COMMUNITY_POST,
			required: [true, "Post id is required"],
		},
		userId: {
			type: Schema.Types.ObjectId,
			refPath: "userType",
			required: [true, "User id is required"],
		},
		userType: {
			type: String,
			enum: {
				values: [ModelCollections.INSTRUCTOR, ModelCollections.STUDENT],
				message: "Invalid user type: {{VALUE}}",
			},
			required: [true, "User type is required"],
		},
	},
	{
		timestamps: true,
	},
);

// Compound unique: one like per user per post
PostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostLike = model("post_like", PostLikeSchema);
