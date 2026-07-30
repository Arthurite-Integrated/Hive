import { UserTypes } from "#enums/user.enums";
import { NotificationType } from "#enums/notification/index";
import {
	throwBadRequestError,
	throwNotFoundError,
	throwForbiddenError,
} from "#helpers/errors/throw-error";
import { ParentStudentLink } from "#models/join-tables/parent-student-link.model";
import { Student } from "#modules/student/student.model";
import { BaseUserService } from "#services/bases/base.user.service";
import { NotificationService } from "#modules/notification/notification.service";
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
		this.notificationService = NotificationService.getInstance();
	}

	linkStudent = async (parentId, studentEmail, relationship) => {
		const student = await Student.findOne({ email: studentEmail });
		if (!student) throwNotFoundError("Student not found with that email");

		const existing = await ParentStudentLink.findOne({
			parentId,
			studentId: student._id,
		});

		let link;

		if (existing) {
			if (existing.status === "active")
				throwBadRequestError("This student is already linked to your account");
			if (existing.status === "pending")
				throwBadRequestError(
					"A pending link request already exists for this student",
				);
			if (existing.status === "revoked") {
				existing.status = "pending";
				existing.relationship = relationship;
				existing.approvedByStudent = false;
				existing.approvedAt = undefined;
				existing.requestedAt = new Date();
				link = await existing.save();
			}
		}

		if (!link) {
			link = await ParentStudentLink.create({
				parentId,
				studentId: student._id,
				relationship,
			});
		}

		// Notify the student about the link request (fire-and-forget, never crash)
		try {
			const parent = await Parent.findById(parentId)
				.select("firstName lastName")
				.lean();
			const parentName = parent
				? `${parent.firstName} ${parent.lastName}`
				: "A parent";

			await this.notificationService.send({
				userId: student._id,
				userType: "student",
				type: NotificationType.PARENT_LINK,
				title: "Parent Link Request",
				body: `${parentName} wants to link to your account as your ${relationship}. You can approve or decline this request from your dashboard.`,
				actionUrl: "/student/parents",
				resourceType: "parent_link",
				resourceId: link._id,
			});
		} catch (err) {
			console.error("Failed to send parent link notification:", err);
		}

		return link;
	};

	getLinkedStudents = async (parentId) => {
		return await ParentStudentLink.find({
			parentId,
			status: "active",
		}).populate("studentId", "firstName lastName email profilePhoto");
	};

	revokeLink = async (parentId, linkId) => {
		const link = await ParentStudentLink.findById(linkId);
		if (!link) throwNotFoundError("Link not found");
		if (link.parentId.toString() !== parentId.toString())
			throwForbiddenError("You are not authorized to revoke this link");
		if (link.status === "revoked")
			throwBadRequestError("This link is already revoked");

		link.status = "revoked";
		return await link.save();
	};
}
