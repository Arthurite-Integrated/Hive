import { getLocationFromIP } from "#helpers/auth/index";

export const extractMetadata = async (req, _res, next) => {
	const ipAddress = req.headers["x-forwarded-for"] || "Unknown IP";
	const clientMetadata = {
		ipAddress,
		location:
			ipAddress === "Unknown IP"
				? "Unknown Location"
				: await getLocationFromIP(ipAddress),
		userAgent: req.headers["user-agent"] || "Unknown User Agent",
	};
	req.clientMetadata = clientMetadata;
	next();
};
