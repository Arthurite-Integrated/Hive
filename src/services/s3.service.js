import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "#config/config";
import { TTL } from "#constants/ttl.constant";

export class S3Service {
	static instance = null;

	/** @returns {S3Service} */
	static getInstance() {
		if (!S3Service.instance) {
			S3Service.instance = new S3Service();
		}
		return S3Service.instance;
	}

	constructor() {
		const clientConfig = {
			region: config.s3.region,
			credentials: {
				accessKeyId: config.s3.accessKeyId,
				secretAccessKey: config.s3.secretAccessKey,
			},
			// Disable automatic checksum injection so presigned PUT URLs work
			// from the browser without needing extra headers (AWS SDK v3 default
			// adds x-amz-checksum-crc32 which causes 403 on direct browser PUTs)
			requestChecksumCalculation: "WHEN_REQUIRED",
			responseChecksumValidation: "WHEN_REQUIRED",
		};

		// Use custom endpoint for local development (e.g. LocalStack)
		if (config.s3.endpoint) {
			clientConfig.endpoint = config.s3.endpoint;
			clientConfig.forcePathStyle = true;
		}

		this.client = new S3Client(clientConfig);
		this.bucket = config.s3.bucket;
	}

	/**
	 * @info - Upload a file buffer to S3
	 * @param {Object} params
	 * @param {string} params.key - The S3 object key (path)
	 * @param {Buffer} params.body - The file buffer
	 * @param {string} params.contentType - The MIME type of the file
	 * @returns {Promise<import("@aws-sdk/client-s3").PutObjectCommandOutput>}
	 */
	upload = async ({ key, body, contentType }) => {
		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: key,
			Body: body,
			ContentType: contentType,
		});
		return this.client.send(command);
	};

	/**
	 * @info - Generate a presigned URL for uploading a file directly to S3
	 * @param {Object} params
	 * @param {string} params.key - The S3 object key (path)
	 * @param {string} params.contentType - The expected MIME type
	 * @param {number} [params.expiresIn=TTL.IN_AN_HOUR] - URL expiration in seconds (default 1 hour)
	 * @returns {Promise<{ url: string, key: string, bucket: string }>}
	 */
	generatePresignedUploadUrl = async ({
		key,
		_contentType,
		expiresIn = TTL.IN_AN_HOUR,
	}) => {
		// Do NOT include ContentType in the command — if we sign it,
		// the browser must send the exact same Content-Type header or S3 rejects.
		// Leaving it out means the presigned URL works with any Content-Type.
		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: key,
		});

		const url = await getSignedUrl(this.client, command, { expiresIn });

		return { url, key, bucket: this.bucket };
	};

	/**
	 * @info - Generate a presigned URL for downloading/viewing a file from S3
	 * @param {Object} params
	 * @param {string} params.key - The S3 object key (path)
	 * @param {number} [params.expiresIn=TTL.IN_AN_HOUR] - URL expiration in seconds (default 1 hour)
	 * @param {string} [params.bucket] - Override bucket (defaults to this.bucket)
	 * @returns {Promise<string>} - The presigned download URL
	 */
	generatePresignedDownloadUrl = async ({
		key,
		expiresIn = TTL.IN_AN_HOUR,
		bucket,
	}) => {
		const command = new GetObjectCommand({
			Bucket: bucket ?? this.bucket,
			Key: key,
		});

		return getSignedUrl(this.client, command, { expiresIn });
	};

	/**
	 * @info - Delete a file from S3
	 * @param {string} key - The S3 object key (path)
	 * @returns {Promise<import("@aws-sdk/client-s3").DeleteObjectCommandOutput>}
	 */
	delete = async (key) => {
		const command = new DeleteObjectCommand({
			Bucket: this.bucket,
			Key: key,
		});
		return this.client.send(command);
	};
}
