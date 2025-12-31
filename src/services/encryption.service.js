import { config } from '#config/config';
import CryptoJS from 'crypto-js';

export class EncryptionService {
  static instance = null;
  secretKey = config.encryption.key;

  /** @private */
  constructor() {}

  /** @returns {EncryptionService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new EncryptionService();
    }
    return this.instance;
  }

  encrypt = (data) => {
    return CryptoJS.AES.encrypt(data, this.secretKey).toString();
  }

  decrypt = (data) => {
    return CryptoJS.AES.decrypt(data, this.secretKey).toString(CryptoJS.enc.Utf8);
  }
}