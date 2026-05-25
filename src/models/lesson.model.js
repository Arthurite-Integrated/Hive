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
				videoUrl: String,
				video360pUrl: String,
				video720pUrl: String,
				video1080pUrl: String,
				audioOnlyUrl: String,
				videoDuration: Number,
			},
		},

		pdfLesson: {
			type: {
				pdfUrl: String,
			},
		},

		liveLesson: {
			type: {
				scheduledAt: Date,
				duration: Number,
				meetingLink: String,
				recordingUrl: String,
				platform: {
					type: String,
					enum: {
						values: Object.values(LESSON_PLATFORM),
						message: "Invalid lesson platform: {{VALUE}}",
					},
				},
			},
		},

		// Flat video fields (used by builder upload flow)
		videoKey: String,
		videoUrl: String,
		video360pUrl: String,
		video720pUrl: String,
		video1080pUrl: String,
		audioOnlyUrl: String,
		videoDuration: Number,
		mediaConvertJobId: String,

		// Flat PDF fields
		pdfUrl: String,
		pdfKey: String,

		// Text lesson
		textContent: String,

		// Flat live fields
		scheduledAt: Date,
		duration: Number,
		meetingLink: String,
		recordingUrl: String,
		platform: {
			type: String,
			enum: {
				values: ["zoom", "meet", "teams", "other"],
				message: "Invalid platform: {{VALUE}}",
			},
		},

		dripDate: Date,

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
LessonSchema.index({ courseId: 1, status: 1 });

export const Lesson = mongoose.model(collectionName, LessonSchema);
