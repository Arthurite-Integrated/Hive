import {
	EnrollmentPaymentType,
	EnrollmentStatus,
} from "#enums/enrollment/enrollment.enums";
import { ModelCollections } from "#enums/models/index";
import { Schema, model } from "mongoose";

export const enrollmentSchema = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: true,
		},
		courseId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COURSE,
			required: true,
		},
		communityId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COMMUNITY,
			required: true,
		},
		status: {
			type: String,
			enum: {
				values: Object.values(EnrollmentStatus),
				message: "Status must be either active, expired, or cancelled",
			},
			required: true,
		},
		progress: {
			type: Number,
			min: 0,
			max: 100,
			default: 0,
		},
		paymentType: {
			type: String,
			enum: {
				values: Object.values(EnrollmentPaymentType),
				message: "Payment type must be either free, one_time, or subscription",
			},
			required: true,
		},
		subscriptionId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.SUBSCRIPTION,
		},
		enrolledAt: {
			type: Date,
			default: Date.now,
			required: true,
		},
		expiresAt: Date,
		lastAccessedAt: Date,
		completedAt: Date,
		certificateIssued: {
			type: Boolean,
			default: false,
		},
		certificateUrl: String,
	},
	{ timestamps: true },
);

// Compound unique index
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export const Enrollment = model(ModelCollections.ENROLLMENT, enrollmentSchema);
