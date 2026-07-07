import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock file-type
const mockFileTypeFromBuffer = vi.fn();
vi.mock("file-type", () => ({
	fileTypeFromBuffer: mockFileTypeFromBuffer,
}));

// Mock S3Service
const mockUpload = vi.fn().mockResolvedValue({ ETag: '"abc"' });
const mockGeneratePresignedUploadUrl = vi.fn().mockResolvedValue({
	url: "https://s3.presigned.url/video",
	key: "videos/test.mp4",
	bucket: "test-bucket",
});

vi.mock("#services/s3.service", () => ({
	S3Service: {
		getInstance: () => ({
			upload: mockUpload,
			generatePresignedUploadUrl: mockGeneratePresignedUploadUrl,
		}),
	},
}));

vi.mock("#config/config", () => ({
	config: {
		s3: {
			region: "us-east-1",
			accessKeyId: "test-key",
			secretAccessKey: "test-secret",
			bucket: "test-bucket",
		},
	},
}));

const {
	uploadAvatar,
	uploadDocument,
	uploadAssignment,
	uploadToS3,
	generateVideoUploadUrl,
	validateVideoUploadKey,
} = await import("#middlewares/upload");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockFile({
	fieldname = "avatar",
	originalname = "photo.png",
	mimetype = "image/png",
	size = 1024,
	buffer = Buffer.from("fake-data"),
} = {}) {
	return { fieldname, originalname, mimetype, size, buffer };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Upload Middleware", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default: file-type detects image/png
		mockFileTypeFromBuffer.mockResolvedValue({ mime: "image/png", ext: "png" });
	});

	describe("Multer instances", () => {
		it("uploadAvatar should be a function", () => {
			expect(typeof uploadAvatar).toBe("function");
		});

		it("uploadDocument should be a function", () => {
			expect(typeof uploadDocument).toBe("function");
		});

		it("uploadAssignment should be a factory returning middleware", () => {
			expect(typeof uploadAssignment()).toBe("function");
		});

		it("uploadAssignment should accept custom MIME types as a Set", () => {
			expect(typeof uploadAssignment(new Set(["application/pdf"]))).toBe(
				"function",
			);
		});

		it("uploadAssignment should accept custom MIME types as an array", () => {
			expect(typeof uploadAssignment(["application/pdf"])).toBe("function");
		});
	});

	describe("uploadToS3", () => {
		it("should upload a single file and derive extension from MIME type", async () => {
			const file = createMockFile();
			const req = { file, files: null };
			const next = vi.fn();

			const middleware = uploadToS3("avatars", new Set(["image/png"]));
			await middleware(req, {}, next);

			expect(mockUpload).toHaveBeenCalledOnce();
			// Key must end in .png (from MIME), not from originalname
			expect(mockUpload).toHaveBeenCalledWith({
				key: expect.stringMatching(/^avatars\/[A-Z0-9]+\.png$/),
				body: file.buffer,
				contentType: "image/png",
			});
			expect(req.s3).toMatchObject({
				key: expect.stringMatching(/^avatars\/.*\.png$/),
				originalName: "photo.png",
				mimetype: "image/png",
				size: 1024,
			});
			expect(next).toHaveBeenCalledWith();
		});

		it("should use MIME-derived extension even if originalname has a different one", async () => {
			// Attacker sends file named "malware.exe" but declares image/png
			mockFileTypeFromBuffer.mockResolvedValue({
				mime: "image/png",
				ext: "png",
			});
			const file = createMockFile({
				originalname: "malware.exe",
				mimetype: "image/png",
			});
			const req = { file, files: null };
			const next = vi.fn();

			const middleware = uploadToS3("avatars", new Set(["image/png"]));
			await middleware(req, {}, next);

			// Extension derived from MIME, not from "malware.exe"
			expect(req.s3.key).toMatch(/\.png$/);
			expect(req.s3.key).not.toMatch(/\.exe/);
		});

		it("should reject files where actual content doesn't match allowed types", async () => {
			// file-type detects it as application/x-executable, not an allowed type
			mockFileTypeFromBuffer.mockResolvedValue({
				mime: "application/x-executable",
				ext: "exe",
			});
			const file = createMockFile({
				originalname: "virus.png",
				mimetype: "image/png",
			});
			const req = { file, files: null };
			const next = vi.fn();

			const middleware = uploadToS3("avatars", new Set(["image/png"]));
			await middleware(req, {}, next);

			expect(mockUpload).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining("does not match"),
				}),
			);
		});

		it("should reject zero-byte files", async () => {
			const file = createMockFile({ buffer: Buffer.alloc(0), size: 0 });
			const req = { file, files: null };
			const next = vi.fn();

			const middleware = uploadToS3("avatars", new Set(["image/png"]));
			await middleware(req, {}, next);

			expect(mockUpload).not.toHaveBeenCalled();
			expect(next).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining("Empty files"),
				}),
			);
		});

		it("should upload multiple files and attach array to req.s3", async () => {
			mockFileTypeFromBuffer.mockResolvedValue({
				mime: "application/pdf",
				ext: "pdf",
			});
			const files = [
				createMockFile({
					fieldname: "assignments",
					originalname: "hw1.pdf",
					mimetype: "application/pdf",
				}),
				createMockFile({
					fieldname: "assignments",
					originalname: "hw2.pdf",
					mimetype: "application/pdf",
				}),
			];
			const req = { file: null, files };
			const next = vi.fn();

			const middleware = uploadToS3(
				"assignments",
				new Set(["application/pdf"]),
			);
			await middleware(req, {}, next);

			expect(mockUpload).toHaveBeenCalledTimes(2);
			expect(Array.isArray(req.s3)).toBe(true);
			expect(req.s3).toHaveLength(2);
			expect(req.s3[0].key).toMatch(/\.pdf$/);
			expect(req.s3[1].key).toMatch(/\.pdf$/);
			expect(next).toHaveBeenCalledWith();
		});

		it("should call next() without uploading if no files are present", async () => {
			const req = { file: null, files: null };
			const next = vi.fn();

			const middleware = uploadToS3("avatars");
			await middleware(req, {}, next);

			expect(mockUpload).not.toHaveBeenCalled();
			expect(req.s3).toBeUndefined();
			expect(next).toHaveBeenCalledWith();
		});

		it("should call next(error) on S3 upload failure", async () => {
			const s3Error = new Error("S3 upload failed");
			mockUpload.mockRejectedValueOnce(s3Error);

			const file = createMockFile();
			const req = { file, files: null };
			const next = vi.fn();

			const middleware = uploadToS3("avatars", new Set(["image/png"]));
			await middleware(req, {}, next);

			expect(next).toHaveBeenCalledWith(s3Error);
		});

		it("should trust multer filter when file-type cannot detect the format", async () => {
			// file-type returns null (e.g. some PDFs, DOCX)
			mockFileTypeFromBuffer.mockResolvedValue(null);
			const file = createMockFile({
				mimetype: "application/pdf",
				originalname: "report.pdf",
			});
			const req = { file, files: null };
			const next = vi.fn();

			const middleware = uploadToS3("documents", new Set(["application/pdf"]));
			await middleware(req, {}, next);

			expect(mockUpload).toHaveBeenCalledOnce();
			expect(req.s3.key).toMatch(/\.pdf$/);
			expect(next).toHaveBeenCalledWith();
		});
	});

	describe("generateVideoUploadUrl", () => {
		it("should return a presigned URL and key for valid video types", async () => {
			const result = await generateVideoUploadUrl({
				contentType: "video/mp4",
				folder: "videos/lessons",
			});

			expect(mockGeneratePresignedUploadUrl).toHaveBeenCalledWith({
				key: expect.stringMatching(/^videos\/lessons\/[A-Z0-9]+\.mp4$/),
				contentType: "video/mp4",
			});
			expect(result.url).toBe("https://s3.presigned.url/video");
			expect(result.key).toMatch(/^videos\/lessons\/.*\.mp4$/);
		});

		it("should throw UnsupportedMediaType for non-video MIME types", async () => {
			await expect(
				generateVideoUploadUrl({
					contentType: "image/png",
					folder: "videos/lessons",
				}),
			).rejects.toThrow(/not allowed/);
		});

		it("should accept video/quicktime (MOV) and use .mov extension", async () => {
			const result = await generateVideoUploadUrl({
				contentType: "video/quicktime",
				folder: "videos",
			});
			expect(result.key).toMatch(/\.mov$/);
		});

		it("should accept video/webm and use .webm extension", async () => {
			const result = await generateVideoUploadUrl({
				contentType: "video/webm",
				folder: "videos",
			});
			expect(result.key).toMatch(/\.webm$/);
		});

		it("should never use fileName for extension derivation", async () => {
			const result = await generateVideoUploadUrl({
				contentType: "video/mp4",
				folder: "videos",
			});
			// Extension comes from MIME, always .mp4
			expect(result.key).toMatch(/\.mp4$/);
		});
	});

	describe("validateVideoUploadKey", () => {
		it("should not throw for a valid key matching the folder", () => {
			expect(() =>
				validateVideoUploadKey("videos/lessons/abc123.mp4", "videos/lessons"),
			).not.toThrow();
		});

		it("should throw BadRequest for a key not matching the folder", () => {
			expect(() =>
				validateVideoUploadKey("other/folder/abc.mp4", "videos/lessons"),
			).toThrow(/Invalid upload key/);
		});

		it("should throw BadRequest for null/undefined key", () => {
			expect(() => validateVideoUploadKey(null, "videos")).toThrow(
				/Invalid upload key/,
			);
			expect(() => validateVideoUploadKey(undefined, "videos")).toThrow(
				/Invalid upload key/,
			);
		});

		it("should throw BadRequest for empty string key", () => {
			expect(() => validateVideoUploadKey("", "videos")).toThrow(
				/Invalid upload key/,
			);
		});
	});
});
