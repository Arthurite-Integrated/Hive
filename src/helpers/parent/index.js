import { throwNotFoundError } from "#helpers/errors/throw-error";
import { Parent } from "#modules/parent/parent.model";

const parentModel = Parent;

export const getParentByEmail = async (email) => {
	return (
		(await parentModel.findOne({ email })) ??
		throwNotFoundError("Parent account does not exist")
	);
};

export const getParentById = async (id) => {
	return (
		(await parentModel.findById(id)) ??
		throwNotFoundError("Parent account does not exist")
	);
};
