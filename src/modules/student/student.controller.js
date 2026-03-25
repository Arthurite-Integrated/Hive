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
	}
}
