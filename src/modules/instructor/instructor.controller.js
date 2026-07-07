import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { InstructorService } from "./instructor.service.js";
import { BaseUserController } from "#services/bases/base.user.controller";

export class InstructorController extends BaseUserController {
	static instance = null;

	static getInstance() {
		if (!InstructorController.instance)
			InstructorController.instance = new InstructorController();
		return InstructorController.instance;
	}

	constructor() {
		super("instructor", InstructorService);
		this.instructorService = InstructorService.getInstance();
	}

	onboard = async (req, res) => {
		const data = await this.instructorService.onboard(req.user, req.body);

		return sendSuccessResponse(
			res,
			{
				message: "Instructor onboarded successfully",
				data,
			},
			StatusCodes.OK,
		);
	};
}
