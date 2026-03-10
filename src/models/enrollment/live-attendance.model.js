import { ModelCollections } from "#enums/models/index";

const LiveAttendanceSchema = new Schema(
	{
		studentId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.STUDENT,
			required: true,
		},
		lessonId: {
			type: Schema.Types.ObjectId,
			ref: ModelCollections.LESSON,
			required: true,
		},
		joinedAt: {
			type: Date,
			required: true,
			default: Date.now,
		},
		leftAt: {
			type: Date,
			default: null,
		},
		duration: {
			type: Number,
			default: null,
		},
	},
	{ timestamps: true },
);

export const LiveAttendance = model(
	ModelCollections.LIVE_ATTENDANCE,
	LiveAttendanceSchema,
);
