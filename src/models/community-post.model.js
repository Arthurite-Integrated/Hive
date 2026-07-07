import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { CommunityPostAttachmentType } from "#enums/community/post.enums";

const PostAttachmentSchema = new Schema(
	{
		type: {
			type: String,
			enum: {
				values: Object.values(CommunityPostAttachmentType),
				message: "Invalid attachment type: {{VALUE}}",
			},
			required: true,
		},
		url: { type: String, required: true },
		name: { type: String },
		size: { type: Number },
	},
	{ _id: false },
);

const CommunityPostSchema = new Schema(
	{
		communityId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COMMUNITY,
			required: [true, "Community id is required"],
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
			required: [true, "Post content is required"],
			maxlength: 5000,
		},
		attachments: {
			type: [PostAttachmentSchema],
			default: undefined,
		},
		likeCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		commentCount: {
			type: Number,
			default: 0,
			min: 0,
		},
		isPinned: {
			type: Boolean,
			default: false,
		},
		isAnnouncement: {
			type: Boolean,
			default: false,
		},
		status: {
			type: String,
			enum: {
				values: ["active", "deleted"],
				message: "Invalid post status: {{VALUE}}",
			},
			default: "active",
		},
	},
	{ timestamps: true },
);

CommunityPostSchema.index({ communityId: 1, isPinned: -1, createdAt: -1 });
CommunityPostSchema.index({ communityId: 1, status: 1 });
CommunityPostSchema.index({ authorId: 1, createdAt: -1 });

export const CommunityPost = model(
	ModelCollections.COMMUNITY_POST,
	CommunityPostSchema,
);
