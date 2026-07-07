import { sendSuccessResponse } from "#helpers/responses/index";
import { BaseUserController } from "#services/bases/base.user.controller";
import { StudentService } from "./student.service.js";

export class StudentController extends BaseUserController {
	static instance = null;

	static getInstance() {
		if (!StudentController.instance)
			StudentController.instance = new StudentController();
		return StudentController.instance;
	}

	constructor() {
		super("student", StudentService);
		this.studentService = StudentService.getInstance();
	}

	approveLink = async (req, res) => {
		const data = await this.studentService.approveLink(
			req.user._id,
			req.params.linkId,
		);
		return sendSuccessResponse(res, {
			message: "Link approved successfully",
			data,
		});
	};

	getLinkedParents = async (req, res) => {
		const data = await this.studentService.getLinkedParents(req.user._id);
		return sendSuccessResponse(res, {
			message: "Linked parents fetched successfully",
			data,
		});
	};

	revokeLink = async (req, res) => {
		await this.studentService.revokeLink(req.user._id, req.params.linkId);
		return sendSuccessResponse(res, {
			message: "Link revoked successfully",
		});
	};
}
