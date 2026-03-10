import {
	COMMUNITY_MEMBER_ROLE,
	COMMUNITY_MEMBERSHIP_STATUS,
} from "#enums/community/index";
import { ModelCollections } from "#enums/models/index";
import { Schema, model } from "mongoose";

const collectionName = ModelCollections.COMMUNITY_MEMBER;

const CommunityMemberSchema = new Schema(
	{
		communityId: {
			type: Schema.Types.ObjectId,
			ref: "Community",
			required: true,
		},
		userId: {
			type: Schema.Types.ObjectId,
			refPath: "userType",
			required: true,
		},
		userType: {
			type: String,
			required: true,
			enum: {
				values: [ModelCollections.INSTRUCTOR, ModelCollections.STUDENT],
				message: "Invalid user type: {{VALUE}}",
			},
		},
		role: {
			type: String,
			enum: {
				values: Object.values(COMMUNITY_MEMBER_ROLE),
				message: "Invalid community member role: {{VALUE}}",
			},
			default: "member",
			required: true,
		},
		status: {
			type: String,
			enum: {
				values: Object.values(COMMUNITY_MEMBERSHIP_STATUS),
				message: "Invalid community membership status: {{VALUE}}",
			},
			default: "pending",
			required: true,
		},
		joinedAt: {
			type: Date,
			default: Date.now,
			required: true,
		},
		lastActive: {
			type: Date,
		},
	},
	{
		timestamps: true,
	},
);

// Compound unique index
CommunityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });
CommunityMemberSchema.index({ communityId: 1, status: 1, role: 1 });
CommunityMemberSchema.index({ userId: 1 });

export const CommunityMember = model(collectionName, CommunityMemberSchema);
