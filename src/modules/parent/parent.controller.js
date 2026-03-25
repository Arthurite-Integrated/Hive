import { BaseUserController } from "#services/bases/base.user.controller";
import { ParentService } from "./parent.service.js";

export class ParentController extends BaseUserController {
	static instance = null;

	static getInstance() {
		if (!ParentController.instance)
			ParentController.instance = new ParentController();
		return ParentController.instance;
	}

	constructor() {
		super("parent", ParentService);
	}
}
