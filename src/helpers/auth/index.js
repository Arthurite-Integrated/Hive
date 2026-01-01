import { webcrypto } from "crypto";
import { v4 } from "uuid";
import axios from "axios";
import _ from "lodash";

export const generateOTP = () => {
  return webcrypto.getRandomValues(new Uint32Array(1)).toString().slice(0, 6);
}

export const generateAuthId = () => {
  return `auth:${v4()}-${Date.now()}`;
}

export const generateOTPId = () => {
  return `otp:${v4()}-${Date.now()}`;
}

export const getLocationFromIP = async (ip) => {
  console.log("ip", ip);
  try {
    // Skip for localhost/private IPs
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168')) {
      return 'Local Network';
    }

    const { data } = await axios.get(`https://ipapi.co/${ip}/json/`);

    console.log(data);
    
    return `${data.city}, ${data.country_name}` || "Unknown Location";
  } catch (error) {
    return "Unknown Location";
  }
}

export const generateAuthenticatedData = (modelData) => {
  const data = {
    ...modelData,
    isAuthenticated: true,
    authenticatedAt: new Date()
  }
  console.log(data);
  return _.omit(data, ["salt", "hash"]);
}