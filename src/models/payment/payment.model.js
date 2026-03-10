import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { PaymentGateway } from "#enums/payment/payment.enums";

const PaymentSchema = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: [true, "Student id is required"],
		},
		paidBy: {
			type: Schema.Types.ObjectId,
			required: [true, "Paid by is required"],
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		currency: {
			type: String,
			required: true,
			trim: true,
			uppercase: true,
		},
		status: {
			type: String,
			enum: {
				values: Object.values(PaymentStatus),
				message: "Invalid payment status: {{VALUE}}",
			},
			default: PaymentStatus.PENDING,
			index: true,
		},
		paymentMethod: {
			type: String,
			trim: true,
		},
		gateway: {
			type: String,
			enum: {
				values: Object.values(PaymentGateway),
				message: "Invalid payment gateway: {{VALUE}}",
			},
			required: true,
			index: true,
		},
		gatewayReference: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		gatewayResponse: {
			type: Schema.Types.Mixed,
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
		subscriptionId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.SUBSCRIPTION,
			index: true,
		},
		discountAmount: {
			type: Number,
			default: 0,
			min: 0,
		},
		referralId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.REFERRAL,
			index: true,
		},
	},
	{ timestamps: true },
);

PaymentSchema.index({ studentId: 1, createdAt: -1 });
PaymentSchema.index({ paidBy: 1, createdAt: -1 });

export const Payment = model(ModelCollections.PAYMENT, PaymentSchema);
