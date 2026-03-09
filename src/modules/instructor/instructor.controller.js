import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "#helpers/responses/index";
import { InstructorService } from "./instructor.service.js";

export class InstructorController {
	static instance = null;

	static getInstance() {
		if (!InstructorController.instance)
			InstructorController.instance = new InstructorController();
		return InstructorController.instance;
	}

	constructor() {
		this.instructorService = InstructorService.getInstance();
	}

	onboard = async (req, res) => {
		const data = await this.instructorService.onboard(req.authData, req.body);

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
