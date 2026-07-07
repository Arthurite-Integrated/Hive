import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";
import { WithdrawalStatus } from "#enums/payment/withdrawal.enums";

const WithdrawalSchema = new Schema(
	{
		teacherId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.INSTRUCTOR,
			required: [true, "Teacher id is required"],
			index: true,
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		fee: {
			type: Number,
			required: true,
			min: 0,
		},
		netAmount: {
			type: Number,
			required: true,
			min: 0,
		},

		bankName: {
			type: String,
			required: [true, "Bank name is required"],
			trim: true,
		},
		accountNumber: {
			type: String,
			required: [true, "Account number is required"],
			trim: true,
		},
		accountName: {
			type: String,
			required: [true, "Account name is required"],
			trim: true,
		},

		status: {
			type: String,
			enum: {
				values: Object.values(WithdrawalStatus),
				message: "Invalid withdrawal status: {{VALUE}}",
			},
			default: WithdrawalStatus.PENDING,
			index: true,
		},
		reference: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		processedAt: Date,
		failureReason: String,
	},
	{ timestamps: true },
);

WithdrawalSchema.index({ teacherId: 1, createdAt: -1 });

export const Withdrawal = model(ModelCollections.WITHDRAWAL, WithdrawalSchema);
