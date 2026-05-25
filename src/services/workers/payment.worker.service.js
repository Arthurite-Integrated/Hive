import { Worker } from "bullmq";
import { QueueNames } from "#enums/queue/index";
import { CacheService } from "#services/cache.service";
import { Payment } from "#models/payment/payment.model";
import { Course } from "#models/course.model";
import { Community } from "#modules/community/community.model";
import { Enrollment } from "#models/enrollment/enrollment.model";
import { CommunityMember } from "#models/community-member.model";
import { TeacherBalance } from "#models/payment/teacher-balance.model";
import { logger } from "#utils/logger";

const PLATFORM_FEE_RATE = 0.1; // 10% platform cut

export class PaymentWorkerService {
	static instance = null;

	/** @returns {PaymentWorkerService} */
	static getInstance() {
		if (!PaymentWorkerService.instance) {
			PaymentWorkerService.instance = new PaymentWorkerService();
		}
		return PaymentWorkerService.instance;
	}

	constructor(concurrency = 5) {
		this.cacheService = CacheService.getInstance();

		this.worker = new Worker(
			QueueNames.PAYMENT,
			async (job) => {
				if (job.name === "payment.success") {
					await this._handlePaymentSuccess(job);
				} else {
					logger.warn(`Payment worker: unknown job name "${job.name}"`, {
						jobId: job.id,
					});
				}
			},
			{
				concurrency,
				connection: this.cacheService.redis,
				lockDuration: 60000,
				maxStalledCount: 2,
				removeOnComplete: { age: 3600, count: 1000 },
				removeOnFail: { age: 86400 },
			},
		);

		this._setupListeners();
	}

	// ─── Job handler ─────────────────────────────────────────────────────────

	/** @private */
	_handlePaymentSuccess = async (job) => {
		const { paymentId } = job.data;

		logger.info(`Payment worker: processing payment.success`, {
			jobId: job.id,
			paymentId,
		});

		// 1. Load payment
		const payment = await Payment.findById(paymentId).lean();
		if (!payment) {
			logger.warn("Payment worker: payment not found", { paymentId });
			return;
		}

		// 2. Determine target type
		const isCourse = Boolean(payment.courseId);
		const isCommunity = Boolean(payment.communityId);

		if (isCourse) {
			await this._processCoursePayment(payment);
		} else if (isCommunity) {
			await this._processCommunityPayment(payment);
		} else {
			logger.warn("Payment worker: unknown target type on payment", {
				paymentId,
			});
		}

		logger.info(`Payment worker: job completed`, { jobId: job.id, paymentId });
	};

	// ─── Course payment ───────────────────────────────────────────────────────

	/** @private */
	_processCoursePayment = async (payment) => {
		const courseId = payment.courseId.toString();
		const studentId = payment.studentId.toString();
		const amount = payment.amount;

		// a. Load course for instructorId + communityId
		const course = await Course.findById(courseId).lean();
		if (!course) {
			logger.warn("Payment worker: course not found", { courseId });
			return;
		}

		// b. Upsert enrollment — skip if already enrolled (idempotent)
		const existingEnrollment = await Enrollment.findOne({
			studentId,
			courseId,
		});
		if (!existingEnrollment) {
			await Enrollment.create({
				studentId,
				courseId,
				communityId: course.communityId || null,
				status: "active",
				paymentType: payment.paymentType || "one_time",
				enrolledAt: new Date(),
			});
		} else {
			logger.info("Payment worker: enrollment already exists, skipping", {
				studentId,
				courseId,
			});
		}

		// c. Increment course enrollment count
		await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

		// d. Credit instructor earnings (90% of amount)
		const platformFee = Math.round(amount * PLATFORM_FEE_RATE);
		const instructorShare = amount - platformFee;

		await TeacherBalance.findOneAndUpdate(
			{ teacherId: course.instructorId },
			{
				$inc: {
					totalEarnings: instructorShare,
					pendingBalance: instructorShare,
				},
				$set: { lastPaymentAt: new Date() },
			},
			{ upsert: true, new: true },
		);

		logger.info("Payment worker: course payment processed", {
			courseId,
			studentId,
			instructorShare,
			platformFee,
		});
	};

	// ─── Community payment ────────────────────────────────────────────────────

	/** @private */
	_processCommunityPayment = async (payment) => {
		const communityId = payment.communityId.toString();
		const studentId = payment.studentId.toString();

		// a. Upsert community membership
		const existingMember = await CommunityMember.findOne({
			communityId,
			userId: studentId,
		});
		if (!existingMember) {
			await CommunityMember.create({
				communityId,
				userId: studentId,
				userType: "student",
				role: "member",
				status: "active",
				joinedAt: new Date(),
			});
		} else {
			// Re-activate if suspended
			if (existingMember.status !== "active") {
				existingMember.status = "active";
				await existingMember.save();
			}
			logger.info(
				"Payment worker: community membership already exists, ensuring active",
				{ studentId, communityId },
			);
		}

		// b. Increment community member count
		await Community.findByIdAndUpdate(communityId, {
			$inc: { memberCount: 1 },
		});

		logger.info("Payment worker: community payment processed", {
			communityId,
			studentId,
		});
	};

	// ─── Listeners ────────────────────────────────────────────────────────────

	/** @private */
	_setupListeners = () => {
		this.worker.on("ready", () => {
			logger.info("Payment worker is ready to process jobs");
		});

		this.worker.on("active", (job) => {
			logger.info(`Payment job ${job.id} is now active`);
		});

		this.worker.on("completed", (job) => {
			logger.info(`Payment job ${job.id} completed`);
		});

		this.worker.on("failed", (job, error) => {
			logger.error(`Payment job ${job?.id || "unknown"} failed`, {
				error: error.message,
				stack: error.stack,
				jobData: job?.data,
			});
		});

		this.worker.on("stalled", (jobId) => {
			logger.warn(`Payment job ${jobId} stalled`);
		});

		this.worker.on("error", (error) => {
			logger.error("Payment worker error", { error: error.message });
		});

		this.worker.on("closed", () => {
			logger.warn("Payment worker closed");
		});
	};

	stop = async () => {
		await this.worker.close();
	};
}

process.on("SIGTERM", async () => {
	await PaymentWorkerService.getInstance().stop();
});

process.on("SIGINT", async () => {
	await PaymentWorkerService.getInstance().stop();
});
