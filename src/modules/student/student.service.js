import { UserTypes } from "#enums/user.enums";
import {
	throwBadRequestError,
	throwNotFoundError,
	throwForbiddenError,
} from "#helpers/errors/throw-error";
import { ParentStudentLink } from "#models/join-tables/parent-student-link.model";
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

	onboard = async (authData, data) => {
		return super.onboard(authData, data, ["interests"]);
	};

	approveLink = async (studentId, linkId) => {
		const link = await ParentStudentLink.findById(linkId);
		if (!link) throwNotFoundError("Link request not found");
		if (link.studentId.toString() !== studentId.toString())
			throwForbiddenError("You are not authorized to approve this link");
		if (link.status === "active")
			throwBadRequestError("This link is already active");
		if (link.status === "revoked")
			throwBadRequestError("This link has been revoked");

		link.status = "active";
		link.approvedByStudent = true;
		link.approvedAt = new Date();
		return await link.save();
	};

	getLinkedParents = async (studentId) => {
		return await ParentStudentLink.find({
			studentId,
			status: "active",
		}).populate("parentId", "firstName lastName email profilePhoto");
	};

	revokeLink = async (studentId, linkId) => {
		const link = await ParentStudentLink.findById(linkId);
		if (!link) throwNotFoundError("Link not found");
		if (link.studentId.toString() !== studentId.toString())
			throwForbiddenError("You are not authorized to revoke this link");
		if (link.status === "revoked")
			throwBadRequestError("This link is already revoked");

		link.status = "revoked";
		return await link.save();
	};
}
