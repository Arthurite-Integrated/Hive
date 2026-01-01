import { getLocationFromIP } from "#helpers/auth/index";

export const extractMetadata = async (req, res, next) => {
  // Extract client metadata from request headers
  const clientMetadata = {
    ipAddress: req.headers["x-forwarded-for"] || "Unknown IP",
    location: req.headers["x-forwarded-for"] ? await getLocationFromIP(req.headers["x-forwarded-for"]) : "Unknown Location",
    userAgent: req.headers["user-agent"] || "Unknown User Agent",
  }
  req.clientMetadata = clientMetadata;
  next();
}