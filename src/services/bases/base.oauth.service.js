export class BaseOAuthService {
	static instance = null;

	authenticate = async () => {};

	signup = async () => {};

	login = async () => {};

	getAccessToken = async () => {};

	refreshToken = async () => {};

	revokeAccessToken = async () => {};

	revokeRefreshToken = async () => {};

	validateAccessToken = async () => {};

	validateRefreshToken = async () => {};

	getUserInfo = async () => {};

	getUserInfoFromAccessToken = async () => {};
}
