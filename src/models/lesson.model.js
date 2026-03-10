import {
	LESSON_PLATFORM,
	LESSON_STATUS,
	LESSON_TYPE,
} from "#enums/community/lesson.enums";
import { ModelCollections } from "#enums/models/index";
import mongoose from "mongoose";

const { Schema, Types } = mongoose;

const collectionName = ModelCollections.LESSON;

const LessonSchema = new Schema(
	{
		moduleId: {
			type: Types.ObjectId,
			ref: ModelCollections.MODULE,
			required: true,
		},
		courseId: {
			type: Types.ObjectId,
			ref: ModelCollections.COURSE,
			required: true,
		},
		title: {
			type: String,
			required: true,
		},
		description: String,
		type: {
			type: String,
			enum: {
				values: Object.values(LESSON_TYPE),
				message: "Invalid lesson type: {{VALUE}}",
			},
			required: true,
		},
		status: {
			type: String,
			enum: {
				values: Object.values(LESSON_STATUS),
				message: "Invalid lesson status: {{VALUE}}",
			},
			default: LESSON_STATUS.DRAFT,
		},
		orderIndex: {
			type: Number,
			required: true,
		},

		videoLesson: {
			type: {
				videoUrl: {
					type: String,
					required: [true, "Video URL is required for video lessons"],
				},
				video360pUrl: String,
				video720pUrl: String,
				video1080pUrl: String,
				audioOnlyUrl: String,
				videoDuration: Number,
			},
			required: [
				function () {
					return this.type === LESSON_TYPE.VIDEO;
				},
				"Video lesson details are required when type is 'video'",
			],
		},

		pdfLesson: {
			type: {
				pdfUrl: {
					type: String,
					required: [true, "PDF URL is required for PDF lessons"],
				},
			},
			required: [
				function () {
					return this.type === LESSON_TYPE.PDF;
				},
				"PDF lesson details are required when type is 'pdf'",
			],
		},

		liveLesson: {
			type: {
				scheduledAt: {
					type: Date,
					required: [
						true,
						"Scheduled date and time is required for live lessons",
					],
				},
				duration: {
					type: Number,
					required: [true, "Duration in minutes is required for live lessons"],
				},
				meetingLink: {
					type: String,
					required: [true, "Meeting link is required for live lessons"],
				},
				recordingUrl: {
					type: String,
					required: false,
				},
				platform: {
					type: String,
					enum: {
						values: Object.values(LESSON_PLATFORM),
						message: "Invalid lesson platform: {{VALUE}}",
					},
				},
			},
			required: [
				function () {
					return this.type === LESSON_TYPE.LIVE;
				},
				"Live lesson details are required when type is 'live'",
			],
		},

		isFreePreview: {
			type: Boolean,
			default: false,
		},
		attachments: [
			{
				name: String,
				url: String,
				size: Number,
				type: String,
			},
		],
	},
	{ timestamps: true },
);

LessonSchema.index({ moduleId: 1, orderIndex: 1 });
LessonSchema.index({ courseId: 1, type: 1 });

export const Lesson = mongoose.model(collectionName, LessonSchema);
