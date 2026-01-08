import { webcrypto } from "crypto";

export const generateBase64 = (data) => {
	return Buffer.from(data).toString("base64");
};

export const decodeBase64 = (data) => {
	return Buffer.from(data, "base64").toString("utf-8");
};

export const generateRandomBytes = (length) => {
	return webcrypto.getRandomValues(new Uint8Array(length));
};
