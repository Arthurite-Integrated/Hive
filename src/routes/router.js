import { Router } from "express";
import {
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  webhookRateLimiter,
} from "#middlewares/rate-limiter";

import authRoutes      from "#modules/auth/auth.routes";
import instructorRoutes from "#modules/instructor/instructor.routes";
import parentRoutes    from "#modules/parent/parent.routes";
import studentRoutes   from "#modules/student/student.routes";
// import webhookRoutes from "#modules/webhook/webhook.routes";
// import uploadRoutes  from "#modules/upload/upload.routes";

const router = Router();

// Auth — tight limit (10 req / 15 min / IP)
router.use("/auth", authRateLimiter, authRoutes);

// General API — 100 req / min / user
router.use("/instructor", apiRateLimiter, instructorRoutes);
router.use("/parent",     apiRateLimiter, parentRoutes);
router.use("/student",    apiRateLimiter, studentRoutes);

// Webhooks — exempt (payment gateways sign their own payloads)
// router.use("/webhooks", webhookRateLimiter, webhookRoutes);

// File uploads — 20 req / hour / user
// router.use("/upload", uploadRateLimiter, uploadRoutes);

export default router;