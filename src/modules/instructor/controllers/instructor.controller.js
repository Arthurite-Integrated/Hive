export class InstructorController {
	static instance = null;

	static getInstance() {
		if (!InstructorController.instance)
			InstructorController.instance = new InstructorController();
		return InstructorController.instance;
	}
}
