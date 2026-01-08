import { UserTypes } from "#enums/user.enums";
import { Instructor } from "#models/instructor.model";
import { BaseUserService } from "#services/bases/base.user.service";

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
}
