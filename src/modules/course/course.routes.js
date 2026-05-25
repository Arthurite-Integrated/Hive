import Router from "express";
import { authenticate } from "#middlewares/authenticate";
import { requireRole } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import {
	createCourseSchema,
	updateCourseSchema,
	courseIdParamSchema,
	communitySlugCourseParamSchema,
} from "#validator/course/course.schema";
import { CourseController } from "#modules/course/course.controller";

export const courseRouter = Router();

const zodEngine = ZodEngine.getInstance();
const courseController = CourseController.getInstance();

// GET /courses/explore — public course search (no auth required)
courseRouter.get(
	"/courses/explore",
	async (req, _res, next) => {
		const header = req.headers.authorization;
		if (header?.startsWith("Bearer ")) {
			try {
				await authenticate(req, _res, next);
				return;
			} catch {
				/* no-op */
			}
		}
		next();
	},
	async (req, res) => {
		const {
			search,
			category,
			difficulty,
			price,
			page = 1,
			limit = 20,
		} = req.query;
		const { Course } = await import("#models/course.model");
		const { sendSuccessResponse } = await import("#helpers/responses/index");

		const filter = { status: "published" };
		if (category) filter.category = category;
		if (difficulty) filter.difficulty = difficulty;
		if (price === "free") filter.isFree = true;
		if (price === "paid") filter.isFree = false;
		if (search) filter.$text = { $search: search };

		const pageNum = Math.max(1, parseInt(page, 10) || 1);
		const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
		const skip = (pageNum - 1) * limitNum;

		const [data, total] = await Promise.all([
			Course.find(filter)
				.sort(
					search ? { score: { $meta: "textScore" } } : { enrollmentCount: -1 },
				)
				.skip(skip)
				.limit(limitNum)
				.lean(),
			Course.countDocuments(filter),
		]);

		return sendSuccessResponse(res, {
			data,
			page: pageNum,
			limit: limitNum,
			total,
			hasMore: skip + data.length < total,
		});
	},
);

// POST /communities/:slug/courses — instructor only
courseRouter.post(
	"/communities/:slug/courses",
	authenticate,
	requireRole("instructor"),
	zodEngine.validate.params(communitySlugCourseParamSchema),
	zodEngine.validate.body(createCourseSchema),
	courseController.create,
);

// GET /communities/:slug/courses — authenticated
courseRouter.get(
	"/communities/:slug/courses",
	authenticate,
	zodEngine.validate.params(communitySlugCourseParamSchema),
	courseController.list,
);

// GET /courses/:courseId — optional auth
courseRouter.get(
	"/courses/:courseId",
	async (req, _res, next) => {
		// Try to authenticate silently; unauthenticated access is fine
		const header = req.headers.authorization;
		if (header?.startsWith("Bearer ")) {
			try {
				await authenticate(req, _res, next);
				return;
			} catch {
				// no-op
			}
		}
		next();
	},
	zodEngine.validate.params(courseIdParamSchema),
	courseController.getById,
);

// PATCH /courses/:courseId
courseRouter.patch(
	"/courses/:courseId",
	authenticate,
	zodEngine.validate.params(courseIdParamSchema),
	zodEngine.validate.body(updateCourseSchema),
	courseController.update,
);

// DELETE /courses/:courseId — archive
courseRouter.delete(
	"/courses/:courseId",
	authenticate,
	zodEngine.validate.params(courseIdParamSchema),
	courseController.archive,
);

// POST /courses/:courseId/publish
courseRouter.post(
	"/courses/:courseId/publish",
	authenticate,
	zodEngine.validate.params(courseIdParamSchema),
	courseController.publish,
);

// GET /courses/:courseId/cover/upload-url
courseRouter.get(
	"/courses/:courseId/cover/upload-url",
	authenticate,
	zodEngine.validate.params(courseIdParamSchema),
	courseController.getCoverUploadUrl,
);
