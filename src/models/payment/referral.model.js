import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import {
	ReferralRewardType,
	ReferralStatus,
} from "#enums/payment/referral.enums";

const ReferralSchema = new Schema(
	{
		referrerId: {
			type: Schema.Types.ObjectId,
			required: [true, "Referrer id is required"],
			refPath: "referrerType",
			index: true,
		},
		referrerType: {
			type: String,
			enum: {
				values: [ModelCollections.INSTRUCTOR, ModelCollections.STUDENT],
				message: "Invalid referrer type: {{VALUE}}",
			},
			required: true,
		},
		referredUserId: {
			type: Schema.Types.ObjectId,
			index: true,
		},
		referredEmail: {
			type: String,
			trim: true,
			lowercase: true,
		},

		status: {
			type: String,
			enum: {
				values: Object.values(ReferralStatus),
				message: "Invalid referral status: {{VALUE}}",
			},
			default: ReferralStatus.PENDING,
			index: true,
		},
		referralCode: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		referralLink: {
			type: String,
			required: true,
		},

		rewardType: {
			type: String,
			enum: {
				values: Object.values(ReferralRewardType),
				message: "Invalid reward type: {{VALUE}}",
			},
			required: true,
		},
		rewardValue: {
			type: Number,
			required: true,
			min: 0,
		},
		rewardAmount: {
			type: Number,
			default: 0,
			min: 0,
		},
		rewardApplied: {
			type: Boolean,
			default: false,
		},
		rewardAppliedAt: Date,
		convertedAt: Date,
	},
	{ timestamps: true },
);

ReferralSchema.index({ referralCode: 1 });
ReferralSchema.index({ referrerId: 1, createdAt: -1 });

export const Referral = model(ModelCollections.REFERRAL, ReferralSchema);
