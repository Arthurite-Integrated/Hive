import Router from "express";
import { authRouter } from "#modules/auth/routes/auth.routes";
import { instructorRouter } from "#modules/instructor/instructor.routes";
import { parentRouter } from "#modules/parent/parent.routes";
import { studentRouter } from "#modules/student/student.routes";
import { userRouter } from "#modules/user/user.routes";
import { communityRouter } from "#modules/community/community.routes";
import { enrollmentRouter } from "#modules/enrollment/enrollment.routes";
import { courseRouter } from "#modules/course/course.routes";
import { builderRouter } from "#modules/course/builder.routes";
import { liveRouter } from "#modules/live/live.routes";
import { assignmentRouter } from "#modules/assessment/assignment.routes";
import { quizRouter } from "#modules/assessment/quiz.routes";
import { earningsRouter } from "#modules/earnings/earnings.routes";
import { reviewRouter } from "#modules/review/review.routes";
import { paymentRouter } from "#modules/payment/payment.routes";
import { notificationRouter } from "#modules/notification/notification.routes";
import { messageRouter } from "#modules/message/message.routes";
import { communityMessageRouter } from "#modules/message/community-message.routes";
import {
	apiLimiter,
	authLimiter,
	pollingLimiter,
} from "#middlewares/rate-limiter";

export const appRouter = Router();

appRouter.use("/auth", authLimiter, authRouter);

appRouter.use("/instructor", apiLimiter, instructorRouter);
appRouter.use("/student", apiLimiter, studentRouter);
appRouter.use("/parent", apiLimiter, parentRouter);
appRouter.use("/users", apiLimiter, userRouter);
appRouter.use("/communities", communityRouter);
appRouter.use("/", apiLimiter, enrollmentRouter);
appRouter.use("/", apiLimiter, courseRouter);
appRouter.use("/", apiLimiter, builderRouter);
appRouter.use("/", apiLimiter, liveRouter);
appRouter.use("/", apiLimiter, assignmentRouter);
appRouter.use("/", apiLimiter, quizRouter);
appRouter.use("/", apiLimiter, earningsRouter);
appRouter.use("/", apiLimiter, reviewRouter);
appRouter.use("/", apiLimiter, paymentRouter);
appRouter.use("/", pollingLimiter, notificationRouter);
appRouter.use("/", pollingLimiter, messageRouter);
appRouter.use("/", pollingLimiter, communityMessageRouter);
