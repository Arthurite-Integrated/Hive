import {
	throwBadRequestError,
	throwNotFoundError,
	throwForbiddenError,
} from "#helpers/errors/throw-error";
import { Lesson } from "#models/lesson.model";
import { LiveAttendance } from "#models/enrollment/live-attendance.model";
import { Course } from "#models/course.model";

export class LiveService {
	static instance = null;

	/** @returns {LiveService} */
	static getInstance() {
		if (!LiveService.instance) LiveService.instance = new LiveService();
		return LiveService.instance;
	}

	constructor() {}

	joinLive = async (lessonId, userId) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			type: "live",
			status: "published",
		});
		if (!lesson) throwNotFoundError("Live lesson not found.");

		// Check timing — allow join 15min before scheduledAt
		const scheduledAt = lesson.scheduledAt || lesson.liveLesson?.scheduledAt;
		if (!scheduledAt)
			throwBadRequestError("This lesson has no scheduled time.");

		const now = new Date();
		const earliestJoin = new Date(scheduledAt.getTime() - 15 * 60 * 1000);
		if (now < earliestJoin) {
			throwBadRequestError(
				"Class hasn't started yet. You can join 15 minutes before the scheduled time.",
			);
		}

		const attendance = await LiveAttendance.create({
			studentId: userId,
			lessonId,
			joinedAt: now,
		});

		const meetingLink = lesson.meetingLink || lesson.liveLesson?.meetingLink;

		return { attendanceId: attendance._id, meetingLink };
	};

	leaveLive = async (attendanceId, userId) => {
		const attendance = await LiveAttendance.findOne({
			_id: attendanceId,
			studentId: userId,
		});
		if (!attendance) throwNotFoundError("Attendance record not found.");
		if (attendance.leftAt) throwBadRequestError("Already left this session.");

		attendance.leftAt = new Date();
		attendance.duration = Math.round(
			(attendance.leftAt - attendance.joinedAt) / 1000,
		);
		await attendance.save();
		return attendance;
	};

	uploadRecording = async (lessonId, instructorId, { key }) => {
		const lesson = await Lesson.findOne({
			_id: lessonId,
			type: "live",
			status: { $ne: "archived" },
		});
		if (!lesson) throwNotFoundError("Live lesson not found.");

		const course = await Course.findById(lesson.courseId);
		if (!course || String(course.instructorId) !== String(instructorId)) {
			throwForbiddenError("You do not have permission to modify this lesson.");
		}

		lesson.recordingUrl = key;
		await lesson.save();
		return lesson;
	};

	getAttendance = async (lessonId, instructorId) => {
		const lesson = await Lesson.findOne({ _id: lessonId, type: "live" });
		if (!lesson) throwNotFoundError("Live lesson not found.");

		const course = await Course.findById(lesson.courseId);
		if (!course || String(course.instructorId) !== String(instructorId)) {
			throwForbiddenError("You do not have permission to view this.");
		}

		const attendees = await LiveAttendance.find({ lessonId })
			.sort({ joinedAt: -1 })
			.lean();
		return attendees;
	};
}
