import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { MembershipService } from "#modules/community/membership.service";

export class MembershipController {
	static instance = null;

	/** @returns {MembershipController} */
	static getInstance() {
		if (!MembershipController.instance) {
			MembershipController.instance = new MembershipController();
		}
		return MembershipController.instance;
	}

	/** @private */
	constructor() {
		this.membershipService = MembershipService.getInstance();
	}

	/**
	 * POST /communities/:communityId/join
	 */
	join = async (req, res) => {
		const { membership, requiresApproval } = await this.membershipService.join(
			req.params.communityId,
			req.user._id,
			req.user.userType,
			req.body.inviteCode,
		);

		const message = requiresApproval
			? "Join request submitted. Awaiting approval."
			: "Successfully joined the community.";

		return sendSuccessResponse(
			res,
			{ message, data: { membership, requiresApproval } },
			StatusCodes.CREATED,
		);
	};

	/**
	 * POST /communities/:communityId/leave
	 */
	leave = async (req, res) => {
		await this.membershipService.leave(req.params.communityId, req.user._id);
		return sendSuccessResponse(res, {
			message: "Successfully left the community.",
		});
	};

	/**
	 * GET /communities/:communityId/members
	 */
	getMembers = async (req, res) => {
		const result = await this.membershipService.getMembers(
			req.params.communityId,
			req.user._id,
			req.query,
		);
		return sendSuccessResponse(res, {
			data: result.data,
			page: result.page,
			limit: result.limit,
			total: result.total,
			hasMore: result.hasMore,
		});
	};

	/**
	 * PATCH /communities/:communityId/members/:userId
	 */
	updateMember = async (req, res) => {
		const membership = await this.membershipService.updateMember(
			req.params.communityId,
			req.user._id,
			req.params.userId,
			req.body,
		);
		return sendSuccessResponse(res, {
			message: "Member updated successfully.",
			data: { membership },
		});
	};

	/**
	 * POST /communities/:communityId/approve/:userId
	 */
	approveMember = async (req, res) => {
		const membership = await this.membershipService.approveMember(
			req.params.communityId,
			req.user._id,
			req.params.userId,
		);
		return sendSuccessResponse(res, {
			message: "Member approved successfully.",
			data: { membership },
		});
	};

	/**
	 * POST /communities/:communityId/invite
	 */
	invite = async (req, res) => {
		const result = await this.membershipService.invite(
			req.params.communityId,
			req.user._id,
			req.body.emails,
		);
		return sendSuccessResponse(res, {
			message: "Invitations processed.",
			data: result,
		});
	};
}
