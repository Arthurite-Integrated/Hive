import { UserTypes } from "#enums/user.enums";
import { BaseUserService } from "#services/bases/base.user.service";
import { Student } from "./student.model.js";

export class StudentService extends BaseUserService {
	static instance = null;

	/** @returns {StudentService} */
	static getInstance() {
		if (!StudentService.instance) {
			StudentService.instance = new StudentService();
		}
		return StudentService.instance;
	}

	/** @private */
	constructor() {
		super(UserTypes.STUDENT, Student);
	}
}
