import Router from "express";
import { authRouter } from "#modules/auth/routes/auth.routes";
import { instructorRouter } from "#modules/instructor/instructor.routes";

export const appRouter = Router();

appRouter.use("/auth", authRouter);

appRouter.use("/instructor", instructorRouter);
