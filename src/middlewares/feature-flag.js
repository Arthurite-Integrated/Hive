import { StatusCodes } from "http-status-codes";
import { config } from "#config/config";

export const requireFeature = (featureName) => {
	return (_req, res, next) => {
		if (!config.features[featureName]) {
			return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
				success: false,
				error: {
					code: "FEATURE_DISABLED",
					message: `${featureName} is not available at this time.`,
				},
			});
		}
		next();
	};
};
