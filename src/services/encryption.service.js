import CryptoJS from "crypto-js";
import { config } from "#config/config";

export class EncryptionService {
	static instance = null;
	secretKey = config.encryption.key;

	/** @returns {EncryptionService} */
	static getInstance() {
		if (!EncryptionService.instance) {
			EncryptionService.instance = new EncryptionService();
		}
		return EncryptionService.instance;
	}

	encrypt = (data) => {
		return CryptoJS.AES.encrypt(data, this.secretKey).toString();
	};

	decrypt = (data) => {
		return CryptoJS.AES.decrypt(data, this.secretKey).toString(
			CryptoJS.enc.Utf8,
		);
	};
}
