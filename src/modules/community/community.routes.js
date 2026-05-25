import Router from "express";
import { z } from "zod";
import { authenticate, requireRole } from "#middlewares/authenticate";
import { JwtService } from "#services/jwt.service";
import { ZodEngine } from "#validator/engine/zod.engine";
import {
	createCommunitySchema,
	updateCommunitySchema,
	communitySlugParamSchema,
} from "#validator/community/community.schema";
import {
	createPostSchema,
	updatePostSchema,
	createCommentSchema,
	postIdParamSchema,
} from "#validator/community/feed.schema";
import {
	joinSchema,
	updateMemberSchema,
	inviteSchema,
} from "#validator/community/membership.schema";
import { CommunityController } from "#modules/community/community.controller";
import { FeedController } from "#modules/community/feed.controller";
import { MembershipController } from "#modules/community/membership.controller";
import { CommunityMessageController } from "#modules/message/community-message.controller";

export const communityRouter = Router();

const jwtService = JwtService.getInstance();
const zodEngine = ZodEngine.getInstance();
const communityController = CommunityController.getInstance();
const feedController = FeedController.getInstance();
const membershipController = MembershipController.getInstance();
const communityMessageController = CommunityMessageController.getInstance();

// Helper: optional JWT — sets req.user if a valid token is present, otherwise continues unauthenticated
const optionalAuth = async (req, res, next) => {
	try {
		const token = jwtService.extractTokenFromHeader(req);
		if (token) {
			await authenticate(req, res, next);
			return;
		}
	} catch {
		// no-op — unauthenticated access is fine here
	}
	next();
};

// POST /communities — instructor only
communityRouter.post(
	"/",
	authenticate,
	requireRole("instructor"),
	zodEngine.validate.body(createCommunitySchema),
	communityController.create,
);

// GET /communities — public list (optional auth to enrich with isMember)
communityRouter.get("/", optionalAuth, communityController.list);

// GET /communities/mine — instructor's own communities
communityRouter.get(
	"/mine",
	authenticate,
	requireRole("instructor"),
	communityController.getMyCommunities,
);

// GET /communities/joined — communities the authenticated user is an active member of
communityRouter.get(
	"/joined",
	authenticate,
	communityController.getJoinedCommunities,
);

// GET /communities/:slug — public detail (optional auth)
communityRouter.get(
	"/:slug",
	zodEngine.validate.params(communitySlugParamSchema),
	async (req, res, next) => {
		// Try to validate token silently; if none, continue without authData
		try {
			const token = jwtService.extractTokenFromHeader(req);
			if (token) {
				await jwtService.validateToken(req, res, next);
				return;
			}
		} catch {
			// no-op — unauthenticated access is fine
		}
		next();
	},
	communityController.getBySlug,
);

// GET /communities/:slug/cover/upload-url — presigned URL for cover image (owner/admin)
communityRouter.get(
	"/:slug/cover/upload-url",
	authenticate,
	zodEngine.validate.params(communitySlugParamSchema),
	communityController.getCoverUploadUrl,
);

// PATCH /communities/:slug — owner or admin
communityRouter.patch(
	"/:slug",
	authenticate,
	zodEngine.validate.params(communitySlugParamSchema),
	zodEngine.validate.body(updateCommunitySchema),
	communityController.update,
);

// DELETE /communities/:slug — owner only (archive)
communityRouter.delete(
	"/:slug",
	authenticate,
	zodEngine.validate.params(communitySlugParamSchema),
	communityController.archive,
);

// Community group chat — uses ObjectId, must come before /:slug catch-all
communityRouter.post(
	"/:communityId/messages",
	authenticate,
	zodEngine.validate.body(
		z.object({
			type: z.enum(["text", "image", "file", "system"]).default("text"),
			content: z.string().min(1),
			attachments: z
				.array(
					z.object({
						name: z.string(),
						url: z.string(),
						size: z.number().optional(),
						type: z.string().optional(),
					}),
				)
				.optional(),
			mentions: z.array(z.string()).optional(),
		}),
	),
	communityMessageController.send,
);

communityRouter.get(
	"/:communityId/messages",
	authenticate,
	zodEngine.validate.query(
		z.object({
			before: z.string().optional(),
			limit: z.coerce.number().int().min(1).max(50).default(15),
		}),
	),
	communityMessageController.getMessages,
);

// ── Membership routes (use :communityId = MongoDB ObjectId) ─────────────────

communityRouter.post(
	"/:communityId/join",
	authenticate,
	zodEngine.validate.body(joinSchema),
	membershipController.join,
);

communityRouter.post(
	"/:communityId/leave",
	authenticate,
	membershipController.leave,
);

communityRouter.get(
	"/:communityId/members",
	authenticate,
	membershipController.getMembers,
);

communityRouter.patch(
	"/:communityId/members/:userId",
	authenticate,
	zodEngine.validate.body(updateMemberSchema),
	membershipController.updateMember,
);

communityRouter.post(
	"/:communityId/approve/:userId",
	authenticate,
	membershipController.approveMember,
);

communityRouter.post(
	"/:communityId/invite",
	authenticate,
	zodEngine.validate.body(inviteSchema),
	membershipController.invite,
);

// ── Feed routes ──────────────────────────────────────────────────────────────

// POST /communities/:slug/posts — create a post (authenticated members)
communityRouter.post(
	"/:slug/posts",
	authenticate,
	zodEngine.validate.body(createPostSchema),
	feedController.createPost,
);

// GET /communities/:slug/posts — list posts (optional auth for liked state)
communityRouter.get("/:slug/posts", optionalAuth, feedController.getPosts);

// PATCH /communities/:slug/posts/:postId — edit a post
communityRouter.patch(
	"/:slug/posts/:postId",
	authenticate,
	zodEngine.validate.params(postIdParamSchema),
	zodEngine.validate.body(updatePostSchema),
	feedController.updatePost,
);

// DELETE /communities/:slug/posts/:postId — delete a post
communityRouter.delete(
	"/:slug/posts/:postId",
	authenticate,
	zodEngine.validate.params(postIdParamSchema),
	feedController.deletePost,
);

// POST /communities/:slug/posts/:postId/like — toggle like
communityRouter.post(
	"/:slug/posts/:postId/like",
	authenticate,
	zodEngine.validate.params(postIdParamSchema),
	feedController.toggleLike,
);

// POST /communities/:slug/posts/:postId/pin — toggle pin (owner/admin only)
communityRouter.post(
	"/:slug/posts/:postId/pin",
	authenticate,
	zodEngine.validate.params(postIdParamSchema),
	feedController.togglePin,
);

// POST /communities/:slug/posts/:postId/comments — create a comment
communityRouter.post(
	"/:slug/posts/:postId/comments",
	authenticate,
	zodEngine.validate.params(postIdParamSchema),
	zodEngine.validate.body(createCommentSchema),
	feedController.createComment,
);

// GET /communities/:slug/posts/:postId/comments — list comments
communityRouter.get(
	"/:slug/posts/:postId/comments",
	feedController.getComments,
);
