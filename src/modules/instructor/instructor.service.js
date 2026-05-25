import { UserTypes } from "#enums/user.enums";
import { BaseUserService } from "#services/bases/base.user.service";
import { Instructor } from "./instructor.model.js";

export class InstructorService extends BaseUserService {
	static instance = null;

	/** @returns {InstructorService} */
	static getInstance() {
		if (!InstructorService.instance) {
			InstructorService.instance = new InstructorService();
		}
		return InstructorService.instance;
	}

	/** @private */
	constructor() {
		super(UserTypes.INSTRUCTOR, Instructor);
	}

	update = async (authData, data) => {
		return super.update(authData, data, ["specializations"]);
	};

	onboard = async (authData, data) => {
		return super.onboard(authData, data, [
			"specializations",
			"gradeExperienceLevels",
			"yearsOfExperience",
			"teachingMode",
			"phone",
		]);
	};
}
