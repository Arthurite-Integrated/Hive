import { UserTypes } from "#enums/user.enums";
import { Parent } from "#models/parent.model";
import { BaseUserService } from "#services/bases/base.user.service";
import _ from "lodash";

export class ParentService extends BaseUserService {
  static instance = null;

  /** @returns {ParentService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new ParentService();
    }
    return this.instance;
  }

  /** @private */
  constructor() {
    super(UserTypes.PARENT, Parent);
  }
}