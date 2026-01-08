import { throwNotFoundError } from "#helpers/errors/throw-error";
import { Student } from "#models/student.model";

const studentModel = Student;

export const getStudentByEmail = async (email) => {
	return (
		(await studentModel.findOne({ email })) ??
		throwNotFoundError("Student account does not exist")
	);
};
