import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { BaseUserController } from "#services/bases/base.user.controller";
import { ParentService } from "./parent.service.js";

export class ParentController extends BaseUserController {
	static instance = null;

	static getInstance() {
		if (!ParentController.instance)
			ParentController.instance = new ParentController();
		return ParentController.instance;
	}

	constructor() {
		super("parent", ParentService);
		this.parentService = ParentService.getInstance();
	}

	linkStudent = async (req, res) => {
		const { studentEmail, relationship } = req.body;
		const data = await this.parentService.linkStudent(
			req.user._id,
			studentEmail,
			relationship,
		);
		return sendSuccessResponse(
			res,
			{
				message: "Link request sent to student",
				data,
			},
			StatusCodes.CREATED,
		);
	};

	getLinkedStudents = async (req, res) => {
		const data = await this.parentService.getLinkedStudents(req.user._id);
		return sendSuccessResponse(res, {
			message: "Linked students fetched successfully",
			data,
		});
	};

	revokeLink = async (req, res) => {
		await this.parentService.revokeLink(req.user._id, req.params.linkId);
		return sendSuccessResponse(res, {
			message: "Link revoked successfully",
		});
	};
}
