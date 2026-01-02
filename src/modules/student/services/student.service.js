import { UserTypes } from "#enums/user.enums";
import { Student } from "#models/student.model";
import { BaseUserService } from "#services/bases/base.user.service";

export class StudentService extends BaseUserService {
  static instance = null;

  /** @returns {StudentService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new StudentService();
    }
    return this.instance;
  }

  /** @private */
  constructor() {
    super(UserTypes.STUDENT, Student);
  }
}