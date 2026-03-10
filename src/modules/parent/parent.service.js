import { UserTypes } from "#enums/user.enums";
import { BaseUserService } from "#services/bases/base.user.service";
import { Parent } from "./parent.model.js";

export class ParentService extends BaseUserService {
	static instance = null;

	/** @returns {ParentService} */
	static getInstance() {
		if (!ParentService.instance) {
			ParentService.instance = new ParentService();
		}
		return ParentService.instance;
	}

	/** @private */
	constructor() {
		super(UserTypes.PARENT, Parent);
	}
}
