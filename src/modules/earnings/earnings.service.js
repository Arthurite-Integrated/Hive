import { TeacherBalance } from "#models/payment/teacher-balance.model";
import { Course } from "#models/course.model";
import { Enrollment } from "#models/enrollment/enrollment.model";

export class EarningsService {
	static instance = null;

	/** @returns {EarningsService} */
	static getInstance() {
		if (!EarningsService.instance) {
			EarningsService.instance = new EarningsService();
		}
		return EarningsService.instance;
	}

	/** @private */
	constructor() {}

	getBalance = async (teacherId) => {
		let balance = await TeacherBalance.findOne({ teacherId }).lean();
		if (!balance) {
			balance = {
				totalEarnings: 0,
				availableBalance: 0,
				pendingBalance: 0,
				withdrawnBalance: 0,
			};
		}
		return balance;
	};

	getHistory = async (teacherId, { page = 1, limit = 20, from, to } = {}) => {
		// Get all courses by this instructor
		const courses = await Course.find({ instructorId: teacherId })
			.select("_id title")
			.lean();
		const courseIds = courses.map((c) => c._id);
		const courseMap = Object.fromEntries(
			courses.map((c) => [String(c._id), c.title]),
		);

		// Build enrollment aggregation to show earnings per enrollment
		const matchStage = { courseId: { $in: courseIds }, status: "active" };
		if (from || to) {
			matchStage.enrolledAt = {};
			if (from) matchStage.enrolledAt.$gte = new Date(from);
			if (to) matchStage.enrolledAt.$lte = new Date(to);
		}

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			Enrollment.find(matchStage)
				.sort({ enrolledAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			Enrollment.countDocuments(matchStage),
		]);

		// Enrich with course title
		const enriched = data.map((e) => ({
			_id: e._id,
			courseId: e.courseId,
			courseTitle: courseMap[String(e.courseId)] || "Unknown",
			studentId: e.studentId,
			enrolledAt: e.enrolledAt,
			paymentType: e.paymentType,
		}));

		return {
			data: enriched,
			page,
			limit,
			total,
			hasMore: page * limit < total,
		};
	};
}
