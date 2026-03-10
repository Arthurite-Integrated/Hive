import axios from "axios";
import { webcrypto } from "crypto";
import _ from "lodash";
import { v4 } from "uuid";
import { JwtService } from "#services/jwt.service";
import { TTL } from "#constants/ttl.constant";
import { CacheService } from "#services/cache.service";

const jwtService = JwtService.getInstance();
const cacheService = CacheService.getInstance();

export const generateOTP = () => {
	return webcrypto.getRandomValues(new Uint32Array(1)).toString().slice(0, 6);
};

export const generateAuthId = (userId = null) => {
	return `auth:${userId || v4()}-${Date.now()}`;
};

export const generateOTPId = () => {
	return `otp:${v4()}-${Date.now()}`;
};

export const generateRefreshTokenId = (userId = null) => {
	return `refresh:${userId || v4()}-${Date.now()}`;
};

export const getLocationFromIP = async (ip) => {
	console.log("ip", ip);
	try {
		// Skip for localhost/private IPs
		if (ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168")) {
			return "Local Network";
		}

		const { data } = await axios.get(`https://ipapi.co/${ip}/json/`);

		console.log(data);

		return `${data.city}, ${data.country_name}` || "Unknown Location";
	} catch {
		return "Unknown Location";
	}
};

export const generateAuthenticatedData = (modelData) => {
	const data = {
		...modelData,
		isAuthenticated: true,
		authenticatedAt: new Date(),
	};
	console.log(data);
	return _.omit(data, ["salt", "hash"]);
};

export const generateAuthTokens = async (authId) => {
	/** @info - Generate & store Refresh Token key */
	const refreshId = generateRefreshTokenId();
	const refreshToken = jwtService.generateTokenFromPayload(
		{
			authId,
			refreshId,
		},
		TTL.IN_7_DAYS,
	);
	await cacheService.set(refreshId, authId, TTL.IN_7_DAYS);

	const accessToken = jwtService.generateToken(authId);
	return { accessToken, refreshToken };
};
