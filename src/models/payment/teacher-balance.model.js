import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";

const TeacherBalanceSchema = new Schema(
	{
		teacherId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.INSTRUCTOR,
			required: [true, "Teacher id is required"],
			unique: true,
		},
		totalEarnings: {
			type: Number,
			default: 0,
			min: 0,
		},
		availableBalance: {
			type: Number,
			default: 0,
			min: 0,
		},
		pendingBalance: {
			type: Number,
			default: 0,
			min: 0,
		},
		withdrawnBalance: {
			type: Number,
			default: 0,
			min: 0,
		},
		lastPaymentAt: Date,
		lastWithdrawalAt: Date,
	},
	{ timestamps: true },
);

export const TeacherBalance = model(
	ModelCollections.TEACHER_BALANCE,
	TeacherBalanceSchema,
);
