import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AWS SDK before importing S3Service
const mockSend = vi.fn();
vi.mock("@aws-sdk/client-s3", () => {
	const MockS3Client = vi.fn(function () {
		this.send = mockSend;
	});
	const MockPutObjectCommand = vi.fn(function (params) {
		Object.assign(this, params);
		this._type = "PutObjectCommand";
	});
	const MockGetObjectCommand = vi.fn(function (params) {
		Object.assign(this, params);
		this._type = "GetObjectCommand";
	});
	const MockDeleteObjectCommand = vi.fn(function (params) {
		Object.assign(this, params);
		this._type = "DeleteObjectCommand";
	});
	return {
		S3Client: MockS3Client,
		PutObjectCommand: MockPutObjectCommand,
		GetObjectCommand: MockGetObjectCommand,
		DeleteObjectCommand: MockDeleteObjectCommand,
	};
});

const mockGetSignedUrl = vi.fn().mockResolvedValue("https://s3.presigned.url/test");
vi.mock("@aws-sdk/s3-request-presigner", () => ({
	getSignedUrl: mockGetSignedUrl,
}));

vi.mock("#config/config", () => ({
	config: {
		s3: {
			region: "us-east-1",
			accessKeyId: "test-key-id",
			secretAccessKey: "test-secret-key",
			bucket: "test-bucket",
		},
	},
}));

const { S3Service } = await import("#services/s3.service");
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } =
	await import("@aws-sdk/client-s3");

describe("S3Service", () => {
	let s3Service;

	beforeEach(() => {
		vi.clearAllMocks();
		S3Service.instance = null;
		s3Service = S3Service.getInstance();
	});

	describe("getInstance", () => {
		it("should return a singleton instance", () => {
			const instance1 = S3Service.getInstance();
			const instance2 = S3Service.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe("upload", () => {
		it("should upload a file buffer to S3", async () => {
			mockSend.mockResolvedValue({ ETag: '"abc123"' });

			const result = await s3Service.upload({
				key: "avatars/test.png",
				body: Buffer.from("fake-image"),
				contentType: "image/png",
			});

			expect(PutObjectCommand).toHaveBeenCalledWith({
				Bucket: "test-bucket",
				Key: "avatars/test.png",
				Body: Buffer.from("fake-image"),
				ContentType: "image/png",
			});
			expect(mockSend).toHaveBeenCalledOnce();
			expect(result).toEqual({ ETag: '"abc123"' });
		});
	});

	describe("generatePresignedUploadUrl", () => {
		it("should return a presigned URL, key, and bucket", async () => {
			const result = await s3Service.generatePresignedUploadUrl({
				key: "videos/lesson.mp4",
				contentType: "video/mp4",
			});

			expect(PutObjectCommand).toHaveBeenCalledWith({
				Bucket: "test-bucket",
				Key: "videos/lesson.mp4",
				ContentType: "video/mp4",
			});
			expect(mockGetSignedUrl).toHaveBeenCalledWith(
				expect.any(Object),
				expect.objectContaining({ _type: "PutObjectCommand" }),
				{ expiresIn: 3600 },
			);
			expect(result).toEqual({
				url: "https://s3.presigned.url/test",
				key: "videos/lesson.mp4",
				bucket: "test-bucket",
			});
		});

		it("should accept a custom expiresIn", async () => {
			await s3Service.generatePresignedUploadUrl({
				key: "videos/lesson.mp4",
				contentType: "video/mp4",
				expiresIn: 600,
			});

			expect(mockGetSignedUrl).toHaveBeenCalledWith(
				expect.any(Object),
				expect.any(Object),
				{ expiresIn: 600 },
			);
		});
	});

	describe("generatePresignedDownloadUrl", () => {
		it("should return a presigned download URL", async () => {
			const result = await s3Service.generatePresignedDownloadUrl({
				key: "documents/report.pdf",
			});

			expect(GetObjectCommand).toHaveBeenCalledWith({
				Bucket: "test-bucket",
				Key: "documents/report.pdf",
			});
			expect(result).toBe("https://s3.presigned.url/test");
		});
	});

	describe("delete", () => {
		it("should delete a file from S3", async () => {
			mockSend.mockResolvedValue({});

			await s3Service.delete("avatars/old.png");

			expect(DeleteObjectCommand).toHaveBeenCalledWith({
				Bucket: "test-bucket",
				Key: "avatars/old.png",
			});
			expect(mockSend).toHaveBeenCalledOnce();
		});
	});
});
