import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import {
	SubscriptionBillingCycle,
	SubscriptionStatus,
} from "#enums/payment/subscription.enums";

const SubscriptionSchema = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: true,
			index: true,
		},
		paidBy: {
			type: Schema.Types.ObjectId,
			required: [true, "Paid by is required"],
		},
		communityId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COMMUNITY,
			index: true,
		},
		courseId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COURSE,
			index: true,
		},
		status: {
			type: String,
			enum: {
				values: Object.values(SubscriptionStatus),
				message: "Invalid subscription status: {{VALUE}}",
			},
			default: SubscriptionStatus.ACTIVE,
			index: true,
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		billingCycle: {
			type: String,
			enum: {
				values: Object.values(SubscriptionBillingCycle),
				message: "Invalid subscription billing cycle: {{VALUE}}",
			},
			required: true,
		},
		currentPeriodStart: {
			type: Date,
			required: true,
		},
		currentPeriodEnd: {
			type: Date,
			required: true,
		},
		nextBillingDate: Date,
		autoRenew: {
			type: Boolean,
			default: true,
		},
		gatewaySubscriptionId: String,
	},
	{ timestamps: true },
);

SubscriptionSchema.index({ studentId: 1, createdAt: -1 });
SubscriptionSchema.index({ communityId: 1, createdAt: -1 });
SubscriptionSchema.index({ courseId: 1, createdAt: -1 });

export const Subscription = model(
	ModelCollections.SUBSCRIPTION,
	SubscriptionSchema,
);
