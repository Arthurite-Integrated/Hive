export class ParentController {
	static instance = null;

	static getInstance() {
		if (!ParentController.instance)
			ParentController.instance = new ParentController();
		return ParentController.instance;
	}
}
