import _ from "lodash";

export const ACTIVITY_RESOURCE_TYPE = {
	AUTH: "auth",
	PROFILE: "profile",
	NOTIFICATION: "notification",
	MESSAGE: "message",
};

export const ACTIVITY_ACTIONS = {
	[ACTIVITY_RESOURCE_TYPE.MESSAGE]: {},
	[ACTIVITY_RESOURCE_TYPE.AUTH]: {
		LOGIN: "login",
		LOGOUT: "logout",
		REGISTER: "register",
		VERIFY_EMAIL: "verify_email",
		FORGOT_PASSWORD: "forgot_password",
		RESET_PASSWORD: "reset_password",
		CHANGE_PASSWORD: "change_password",
	},
	[ACTIVITY_RESOURCE_TYPE.PROFILE]: {
		PROFILE_UPDATED: "profile_updated",
	},
	[ACTIVITY_RESOURCE_TYPE.NOTIFICATION]: {
		NOTIFICATION_READ: "notification_read",
	},
};

export const FLAT_ACTIVITY_ACTIONS = _.flattenDeep(
	Object.values(ACTIVITY_ACTIONS),
);
