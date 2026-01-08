import { UserTypes } from "#enums/user.enums";
import { Parent } from "#models/parent.model";
import { BaseUserService } from "#services/bases/base.user.service";

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
