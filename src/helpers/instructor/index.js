import { throwNotFoundError } from "#helpers/errors/throw-error";
import { Instructor } from "#models/instructor.model";

const instructorModel = Instructor;

export const getInstructorByEmail = async (email) => {
  return await instructorModel.findOne({ email }) ?? throwNotFoundError("Account does not exist");
}

export const getInstructorById = async (id) => {
  return await instructorModel.findById(id) ?? throwNotFoundError("Instructor not found");
}