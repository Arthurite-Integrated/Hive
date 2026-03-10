import { Schema, model } from "mongoose";
import { ModelCollections } from "#enums/models/index";

const CertificateSchema = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: [true, "Student id is required"],
			index: true,
		},
		courseId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.COURSE,
			required: [true, "Course id is required"],
			index: true,
		},
		enrollmentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.ENROLLMENT,
			required: [true, "Enrollment id is required"],
		},

		certificateNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		certificateUrl: {
			type: String,
			required: [true, "Certificate URL is required"],
		},
		qrCodeUrl: String,

		verificationCode: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		isVerified: {
			type: Boolean,
			default: false,
		},

		// Snapshots — frozen at issuance time
		courseName: {
			type: String,
			required: true,
		},
		teacherName: {
			type: String,
			required: true,
		},
		completionDate: {
			type: Date,
			required: true,
		},
		issuedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{ timestamps: true },
);

CertificateSchema.index({ studentId: 1, courseId: 1 });
CertificateSchema.index({ verificationCode: 1 });

export const Certificate = model(
	ModelCollections.CERTIFICATE,
	CertificateSchema,
);
