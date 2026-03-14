import { fileTypeFromBuffer } from "file-type";
import multer from "multer";
import { ulid } from "ulid";
import { createUnsupportedMediaType } from "#errors/UnsupportedMediaType";
import {
	throwBadRequestError,
	throwUnsupportedMediaTypeError,
} from "#helpers/errors/throw-error";
import { S3Service } from "#services/s3.service";

// ─── MIME → Safe Extension Map ──────────────────────────────────────────────

const MIME_TO_EXT = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/gif": "gif",
	"image/webp": "webp",
	"application/pdf": "pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":
		"docx",
	"video/mp4": "mp4",
	"video/quicktime": "mov",
	"video/x-msvideo": "avi",
	"video/webm": "webm",
};

// ─── MIME Type Sets ─────────────────────────────────────────────────────────

const IMAGE_MIMES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
]);

const DOCUMENT_MIMES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const VIDEO_MIMES = new Set([
	"video/mp4",
	"video/quicktime",
	"video/x-msvideo",
	"video/webm",
]);

// ─── File Filter Factory ────────────────────────────────────────────────────

const createFileFilter = (allowedMimes) => {
	return (_req, file, cb) => {
		if (allowedMimes.has(file.mimetype)) {
			cb(null, true);
		} else {
			cb(
				createUnsupportedMediaType(
					`File type "${file.mimetype}" is not allowed. Accepted: ${[...allowedMimes].join(", ")}`,
				),
			);
		}
	};
};

// ─── Safe Extension Helper ──────────────────────────────────────────────────

/**
 * @info - Returns a safe file extension derived from the MIME type, never from user input.
 * @param {string} mimetype
 * @returns {string}
 */
const getSafeExtension = (mimetype) => {
	return MIME_TO_EXT[mimetype] || "bin";
};

// ─── Multer Instances (memory storage) ──────────────────────────────────────

/**
 * @info - Upload a single avatar image (max 5 MB)
 * Field name: "avatar"
 */
export const uploadAvatar = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: createFileFilter(IMAGE_MIMES),
}).single("avatar");

/**
 * @info - Upload a single document (max 50 MB) — PDF, DOCX, or images
 * Field name: "document"
 */
export const uploadDocument = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 50 * 1024 * 1024 },
	fileFilter: createFileFilter(DOCUMENT_MIMES),
}).single("document");

/**
 * @info - Upload up to 5 assignment files (max 50 MB each)
 * Field name: "assignments"
 * @param {Set<string>} [allowedMimes] - Custom allowed MIME types (defaults to DOCUMENT_MIMES)
 */
export const uploadAssignment = (allowedMimes = DOCUMENT_MIMES) =>
	multer({
		storage: multer.memoryStorage(),
		limits: { fileSize: 50 * 1024 * 1024 },
		fileFilter: createFileFilter(
			allowedMimes instanceof Set ? allowedMimes : new Set(allowedMimes),
		),
	}).array("assignments", 5);

// ─── Magic Number Validation ────────────────────────────────────────────────

/**
 * @info - Validates that the file buffer's actual content matches the declared MIME type.
 *         Prevents MIME spoofing (e.g. uploading an .exe with Content-Type: image/png).
 * @param {Buffer} buffer - The file buffer
 * @param {string} declaredMime - The MIME type the client declared
 * @param {Set<string>} allowedMimes - The set of allowed MIME types
 * @returns {Promise<string>} - The verified MIME type
 */
const validateFileContent = async (buffer, declaredMime, allowedMimes) => {
	const detected = await fileTypeFromBuffer(buffer);

	// file-type can't detect plain text formats like .docx XML internals or some PDFs
	// For files it can detect, verify the actual type matches what's allowed
	if (detected) {
		if (!allowedMimes.has(detected.mime)) {
			throwUnsupportedMediaTypeError(
				`File content detected as "${detected.mime}" which is not allowed. The declared type "${declaredMime}" does not match the actual file content`,
			);
		}
		return detected.mime;
	}

	// If file-type can't detect (e.g. some PDFs, DOCX), trust the multer filter that already ran
	return declaredMime;
};

// ─── S3 Upload Helper ───────────────────────────────────────────────────────

/**
 * @info - Middleware that takes the multer-parsed file(s) from memory, validates content,
 *         and uploads them to S3. Attaches the S3 key(s) to req.s3 for downstream use.
 * @param {string} folder - The S3 folder/prefix (e.g. "avatars", "documents", "assignments")
 * @param {Set<string>} [allowedMimes] - Allowed MIME types for content validation (defaults to DOCUMENT_MIMES)
 */
export const uploadToS3 =
	(folder, allowedMimes = DOCUMENT_MIMES) =>
	async (req, _res, next) => {
		try {
			const s3 = S3Service.getInstance();
			const files = req.files || (req.file ? [req.file] : []);

			if (files.length === 0) {
				return next();
			}

			const uploaded = await Promise.all(
				files.map(async (file) => {
					// Reject zero-byte files
					if (!file.buffer || file.buffer.length === 0) {
						throwBadRequestError("Empty files are not allowed");
					}

					// Validate actual file content against declared MIME type
					const verifiedMime = await validateFileContent(
						file.buffer,
						file.mimetype,
						allowedMimes,
					);

					// Derive extension from verified MIME type, never from user input
					const ext = getSafeExtension(verifiedMime);
					const key = `${folder}/${ulid()}.${ext}`;

					await s3.upload({
						key,
						body: file.buffer,
						contentType: verifiedMime,
					});

					return {
						key,
						originalName: file.originalname,
						mimetype: verifiedMime,
						size: file.size,
					};
				}),
			);

			req.s3 = uploaded.length === 1 ? uploaded[0] : uploaded;
			next();
		} catch (error) {
			next(error);
		}
	};

// ─── Presigned URL for Video Uploads ────────────────────────────────────────

/**
 * @info - Controller helper: generates a presigned upload URL for video files.
 *         The frontend uploads directly to S3 using this URL, then notifies the API with the key.
 * @param {Object} params
 * @param {string} params.contentType - The video MIME type
 * @param {string} params.folder - The S3 folder/prefix (e.g. "videos/lessons")
 * @returns {Promise<{ url: string, key: string }>}
 */
export const generateVideoUploadUrl = async ({ contentType, folder }) => {
	if (!VIDEO_MIMES.has(contentType)) {
		throwUnsupportedMediaTypeError(
			`Video type "${contentType}" is not allowed. Accepted: ${[...VIDEO_MIMES].join(", ")}`,
		);
	}

	const ext = getSafeExtension(contentType);
	const key = `${folder}/${ulid()}.${ext}`;
	const s3 = S3Service.getInstance();

	const { url } = await s3.generatePresignedUploadUrl({ key, contentType });

	return { url, key };
};

/**
 * @info - Validates that a video upload key matches expected format and folder
 * @param {string} key - The S3 key the frontend reports after upload
 * @param {string} folder - Expected folder prefix
 */
export const validateVideoUploadKey = (key, folder) => {
	if (!key || !key.startsWith(`${folder}/`)) {
		throwBadRequestError(`Invalid upload key. Expected key under "${folder}/"`);
	}
};
