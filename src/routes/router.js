import Router from "express";
import { authRouter } from "#modules/auth/routes/auth.routes";
import { instructorRouter } from "#modules/instructor/instructor.routes";
import { parentRouter } from "#modules/parent/parent.routes";
import { studentRouter } from "#modules/student/student.routes";

export const appRouter = Router();

appRouter.use("/auth", authRouter);

appRouter.use("/instructor", instructorRouter);
appRouter.use("/student", studentRouter);
appRouter.use("/parent", parentRouter);
