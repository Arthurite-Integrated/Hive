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
			index: true,
		},
		authorId: {
			type: Schema.Types.ObjectId,
			required: [true, "Author id is required"],
			index: true,
		},
		content: {
			type: String,
			required: [true, "Post content is required"],
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
	},
	{ timestamps: true },
);

CommunityPostSchema.index({ communityId: 1, isPinned: -1, createdAt: -1 });
CommunityPostSchema.index({ authorId: 1, createdAt: -1 });

export const CommunityPost = model(
	ModelCollections.COMMUNITY_POST,
	CommunityPostSchema,
);
