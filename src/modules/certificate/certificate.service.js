import { Certificate } from "#models/certificate.model";

export class CertificateService {
	static instance = null;

	static getInstance() {
		if (!CertificateService.instance) {
			CertificateService.instance = new CertificateService();
		}
		return CertificateService.instance;
	}

	/**
	 * GET /users/me/certificates
	 */
	getMyCertificates = async (userId) => {
		const certificates = await Certificate.find({ studentId: userId })
			.sort({ issuedAt: -1 })
			.lean();
		return { data: certificates };
	};
}
