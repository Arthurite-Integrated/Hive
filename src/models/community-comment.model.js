import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";

const CommunityCommentSchema = new Schema(
	{
		postId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COMMUNITY_POST,
			required: [true, "Post id is required"],
		},
		authorId: {
			type: Schema.Types.ObjectId,
			refPath: "authorType",
			required: [true, "Author id is required"],
		},
		authorType: {
			type: String,
			enum: {
				values: [ModelCollections.INSTRUCTOR, ModelCollections.STUDENT],
				message: "Invalid author type: {{VALUE}}",
			},
			required: [true, "Author type is required"],
		},
		content: {
			type: String,
			required: [true, "Comment content is required"],
			maxlength: 1000,
		},
		status: {
			type: String,
			enum: {
				values: ["active", "deleted"],
				message: "Invalid comment status: {{VALUE}}",
			},
			default: "active",
		},
	},
	{
		timestamps: true,
	},
);

CommunityCommentSchema.index({ postId: 1, createdAt: 1 });
CommunityCommentSchema.index({ postId: 1, status: 1 });

export const CommunityComment = model(
	"community_comment",
	CommunityCommentSchema,
);
