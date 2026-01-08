import Router from "express";
import { extractMetadata } from "#middlewares/extract-metadata";
import { authRouter } from "#modules/auth/routes/auth.routes";

export const appRouter = Router();

appRouter.use(extractMetadata);

appRouter.use("/auth", authRouter);
