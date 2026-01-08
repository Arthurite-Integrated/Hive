import { throwNotFoundError } from "#helpers/errors/throw-error";
import { Parent } from "#models/parent.model";

const parentModel = Parent;

export const getParentByEmail = async (email) => {
	return (
		(await parentModel.findOne({ email })) ??
		throwNotFoundError("Parent account does not exist")
	);
};
