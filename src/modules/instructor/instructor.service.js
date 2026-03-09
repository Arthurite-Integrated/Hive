import _ from "lodash";
import { UserTypes } from "#enums/user.enums";
import { throwBadRequestError } from "#helpers/errors/throw-error";
import { Location } from "#models/location.model";
import { BaseUserService } from "#services/bases/base.user.service";
import { Instructor } from "./instructor.model.js";

export class InstructorService extends BaseUserService {
	static instance = null;

	onboardFields = [
		"subjects",
		"gradeLevels",
		"preferredTeachingMode",
		"bio",
		"phone",
		"location",
	];

	/** @returns {InstructorService} */
	static getInstance() {
		if (!InstructorService.instance) {
			InstructorService.instance = new InstructorService();
		}
		return InstructorService.instance;
	}

	/** @private */
	constructor() {
		super(UserTypes.INSTRUCTOR, Instructor);
		this.location = Location;
	}

	/** @info - Instructor onboarding */
	onboard = async (authData, data) => {
		const update = _.pick(data, this.onboardFields);

		let location;
		try {
			location = await this.location.create({
				address: data.location.address,
				city: data.location.city,
				state: data.location.state,
				country: data.location.country,
				zipCode: data.location.zipCode,
				accountId: authData._id, // The Instructors id
			});
		} catch (e) {
			if (e.code === 11000)
				return throwBadRequestError(
					"Location for this instructor already exists. Please update the existing location instead of creating a new one.",
				);
			throw e;
		}

		console.log("Created location:", location);

		delete update.location;

		return (
			(await this.dbModel.findByIdAndUpdate(authData._id, {
				...update,
				location: location._id,
				onboarded: true,
			})) ??
			throwBadRequestError("Failed to onboard instructor. Please try again.")
		);
	};
}
