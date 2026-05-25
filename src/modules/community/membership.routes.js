import Router from "express";
import { z } from "zod";
import { authenticate } from "#middlewares/authenticate";
import { ZodEngine } from "#validator/engine/zod.engine";
import {
	joinSchema,
	updateMemberSchema,
	inviteSchema,
	memberUserIdParamSchema,
} from "#validator/community/membership.schema";
import { MembershipController } from "#modules/community/membership.controller";

export const membershipRouter = Router({ mergeParams: true });

const zodEngine = ZodEngine.getInstance();
const membershipController = MembershipController.getInstance();

const communityIdParamSchema = z.object({ communityId: z.string().min(1) });

// POST /communities/:communityId/join
membershipRouter.post(
	"/join",
	authenticate,
	zodEngine.validate.params(communityIdParamSchema),
	zodEngine.validate.body(joinSchema),
	membershipController.join,
);

// POST /communities/:communityId/leave
membershipRouter.post(
	"/leave",
	authenticate,
	zodEngine.validate.params(communityIdParamSchema),
	membershipController.leave,
);

// GET /communities/:communityId/members
membershipRouter.get(
	"/members",
	authenticate,
	zodEngine.validate.params(communityIdParamSchema),
	membershipController.getMembers,
);

// PATCH /communities/:communityId/members/:userId
membershipRouter.patch(
	"/members/:userId",
	authenticate,
	zodEngine.validate.params(memberUserIdParamSchema),
	zodEngine.validate.body(updateMemberSchema),
	membershipController.updateMember,
);

// POST /communities/:communityId/approve/:userId
membershipRouter.post(
	"/approve/:userId",
	authenticate,
	zodEngine.validate.params(memberUserIdParamSchema),
	membershipController.approveMember,
);

// POST /communities/:communityId/invite
membershipRouter.post(
	"/invite",
	authenticate,
	zodEngine.validate.params(communityIdParamSchema),
	zodEngine.validate.body(inviteSchema),
	membershipController.invite,
);
