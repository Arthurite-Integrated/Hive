import { authRouter } from "#modules/auth/routes/auth.routes";
import Router from "express";

export const appRouter = Router();

appRouter.use("/auth", authRouter);