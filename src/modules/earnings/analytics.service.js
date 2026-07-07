import { Course } from "#models/course.model";
import { Enrollment } from "#models/enrollment/enrollment.model";
import { LessonProgress } from "#models/enrollment/lesson-progress.model";
import { Lesson } from "#models/lesson.model";

export class AnalyticsService {
	static instance = null;

	/** @returns {AnalyticsService} */
	static getInstance() {
		if (!AnalyticsService.instance) {
			AnalyticsService.instance = new AnalyticsService();
		}
		return AnalyticsService.instance;
	}

	/** @private */
	constructor() {}

	getOverview = async (teacherId, { period = "30d" } = {}) => {
		const courses = await Course.find({
			instructorId: teacherId,
			status: { $ne: "archived" },
		}).lean();
		const courseIds = courses.map((c) => c._id);

		const periodDays =
			period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
		const since = new Date();
		since.setDate(since.getDate() - periodDays);

		// Enrollment trend — group by day
		const enrollmentTrend = await Enrollment.aggregate([
			{ $match: { courseId: { $in: courseIds }, enrolledAt: { $gte: since } } },
			{
				$group: {
					_id: {
						$dateToString: { format: "%Y-%m-%d", date: "$enrolledAt" },
					},
					count: { $sum: 1 },
				},
			},
			{ $sort: { _id: 1 } },
			{ $project: { date: "$_id", count: 1, _id: 0 } },
		]);

		// Completion rates per course
		const completionRates = [];
		for (const course of courses) {
			const totalEnrolled = await Enrollment.countDocuments({
				courseId: course._id,
			});
			const completed = await Enrollment.countDocuments({
				courseId: course._id,
				progress: 100,
			});
			completionRates.push({
				courseId: course._id,
				title: course.title,
				totalEnrolled,
				completed,
				rate:
					totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0,
			});
		}

		// Total students
		const totalStudents = await Enrollment.countDocuments({
			courseId: { $in: courseIds },
		});

		// Total courses
		const totalCourses = courses.length;

		return {
			totalStudents,
			totalCourses,
			enrollmentTrend,
			completionRates,
		};
	};

	getCourseAnalytics = async (teacherId, courseId, { period = "30d" } = {}) => {
		const course = await Course.findOne({
			_id: courseId,
			instructorId: teacherId,
		});
		if (!course) return null;

		const periodDays =
			period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
		const since = new Date();
		since.setDate(since.getDate() - periodDays);

		// Enrollment over time
		const enrollment = await Enrollment.aggregate([
			{ $match: { courseId: course._id, enrolledAt: { $gte: since } } },
			{
				$group: {
					_id: {
						$dateToString: { format: "%Y-%m-%d", date: "$enrolledAt" },
					},
					count: { $sum: 1 },
				},
			},
			{ $sort: { _id: 1 } },
			{ $project: { date: "$_id", count: 1, _id: 0 } },
		]);

		// Drop-off analysis — how many students completed each lesson
		const lessons = await Lesson.find({ courseId, status: "published" })
			.sort({ orderIndex: 1 })
			.lean();
		const dropOff = [];
		for (const lesson of lessons) {
			const completed = await LessonProgress.countDocuments({
				lessonId: lesson._id,
				completed: true,
			});
			const total = await LessonProgress.countDocuments({
				lessonId: lesson._id,
			});
			dropOff.push({
				lessonId: lesson._id,
				title: lesson.title,
				completed,
				total,
			});
		}

		// Completion rate
		const totalEnrolled = await Enrollment.countDocuments({
			courseId: course._id,
		});
		const completedCount = await Enrollment.countDocuments({
			courseId: course._id,
			progress: 100,
		});

		return {
			course: { _id: course._id, title: course.title },
			enrollment,
			dropOff,
			totalEnrolled,
			completed: completedCount,
			completionRate:
				totalEnrolled > 0
					? Math.round((completedCount / totalEnrolled) * 100)
					: 0,
		};
	};
}
