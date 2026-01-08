export class StudentController {
	static instance = null;

	static getInstance() {
		if (!StudentController.instance)
			StudentController.instance = new StudentController();
		return StudentController.instance;
	}

	constructor() {}
}
