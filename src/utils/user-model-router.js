import { UserTypes } from "#enums/user.enums";
import { Instructor } from "#modules/instructor/instructor.model";
import { Parent } from "#modules/parent/parent.model";
import { Student } from "#modules/student/student.model";

const modelMap = {
	[UserTypes.INSTRUCTOR]: Instructor,
	[UserTypes.STUDENT]: Student,
	[UserTypes.PARENT]: Parent,
};

export function getUserModel(userType) {
	const Model = modelMap[userType];
	if (!Model) {
		throw new Error(`Unknown userType: ${userType}`);
	}
	return Model;
}

export async function findUserByEmail(email) {
	const results = await Promise.all([
		Instructor.findOne({ email }),
		Student.findOne({ email }),
		Parent.findOne({ email }),
	]);

	return results.find((user) => user !== null) ?? null;
}
