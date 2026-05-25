import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	HeadObjectCommand,
	CreateBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const LOCALSTACK_ENDPOINT = "http://localhost:4566";
const BUCKET = "hive-integration-test";
const REGION = "us-east-1";

const client = new S3Client({
	region: REGION,
	endpoint: LOCALSTACK_ENDPOINT,
	forcePathStyle: true,
	credentials: {
		accessKeyId: "test",
		secretAccessKey: "test",
	},
});

let localstackAvailable = false;

describe("S3 Integration Tests (LocalStack)", () => {
	beforeAll(async () => {
		try {
			await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
			localstackAvailable = true;
		} catch (err) {
			if (
				err.name === "BucketAlreadyOwnedByYou" ||
				err.name === "BucketAlreadyExists"
			) {
				localstackAvailable = true;
			}
			// else: LocalStack not running — localstackAvailable stays false
		}
	});

	afterAll(async () => {
		client.destroy();
	});

	it("should upload a file to S3", async (ctx) => {
		if (!localstackAvailable) return ctx.skip();
		const key = "avatars/test-avatar.png";
		const body = Buffer.from("fake-png-data-for-testing");

		await client.send(
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				Body: body,
				ContentType: "image/png",
			}),
		);

		const head = await client.send(
			new HeadObjectCommand({ Bucket: BUCKET, Key: key }),
		);
		expect(head.$metadata.httpStatusCode).toBe(200);
		expect(head.ContentType).toBe("image/png");
		expect(head.ContentLength).toBe(body.length);
	});

	it("should download the uploaded file and match content", async (ctx) => {
		if (!localstackAvailable) return ctx.skip();
		const key = "avatars/test-avatar.png";

		const response = await client.send(
			new GetObjectCommand({ Bucket: BUCKET, Key: key }),
		);

		const chunks = [];
		for await (const chunk of response.Body) {
			chunks.push(chunk);
		}
		const downloaded = Buffer.concat(chunks).toString();

		expect(downloaded).toBe("fake-png-data-for-testing");
	});

	it("should generate a presigned upload URL and upload via HTTP", async (ctx) => {
		if (!localstackAvailable) return ctx.skip();
		const key = "documents/test-doc.pdf";

		const url = await getSignedUrl(
			client,
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				ContentType: "application/pdf",
			}),
			{ expiresIn: 300 },
		);

		expect(url).toContain(LOCALSTACK_ENDPOINT);
		expect(url).toContain(key);

		const pdfContent = Buffer.from("%PDF-1.4 fake pdf content");
		const response = await fetch(url, {
			method: "PUT",
			body: pdfContent,
			headers: { "Content-Type": "application/pdf" },
		});

		expect(response.ok).toBe(true);

		const head = await client.send(
			new HeadObjectCommand({ Bucket: BUCKET, Key: key }),
		);
		expect(head.ContentLength).toBe(pdfContent.length);
	});

	it("should generate a presigned download URL", async (ctx) => {
		if (!localstackAvailable) return ctx.skip();
		const key = "avatars/test-avatar.png";

		const url = await getSignedUrl(
			client,
			new GetObjectCommand({ Bucket: BUCKET, Key: key }),
			{ expiresIn: 300 },
		);

		expect(url).toContain(LOCALSTACK_ENDPOINT);

		const response = await fetch(url);
		expect(response.ok).toBe(true);

		const text = await response.text();
		expect(text).toBe("fake-png-data-for-testing");
	});

	it("should delete a file from S3", async (ctx) => {
		if (!localstackAvailable) return ctx.skip();
		const key = "avatars/test-avatar.png";

		await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));

		try {
			await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
			expect.fail("Object should have been deleted");
		} catch (err) {
			expect(err.name).toBe("NotFound");
		}
	});

	it("should upload multiple files (simulating assignment submission)", async (ctx) => {
		if (!localstackAvailable) return ctx.skip();
		const files = [
			{ key: "assignments/hw1.pdf", content: "homework 1 content" },
			{ key: "assignments/hw2.pdf", content: "homework 2 content" },
			{ key: "assignments/hw3.png", content: "homework 3 image" },
		];

		await Promise.all(
			files.map((f) =>
				client.send(
					new PutObjectCommand({
						Bucket: BUCKET,
						Key: f.key,
						Body: Buffer.from(f.content),
						ContentType: f.key.endsWith(".pdf")
							? "application/pdf"
							: "image/png",
					}),
				),
			),
		);

		for (const f of files) {
			const head = await client.send(
				new HeadObjectCommand({ Bucket: BUCKET, Key: f.key }),
			);
			expect(head.$metadata.httpStatusCode).toBe(200);
		}
	});

	it("should simulate the video presigned URL workflow", async (ctx) => {
		if (!localstackAvailable) return ctx.skip();
		const key = "videos/lessons/intro-lecture.mp4";
		const videoContent = Buffer.from("fake-mp4-video-bytes");

		const uploadUrl = await getSignedUrl(
			client,
			new PutObjectCommand({
				Bucket: BUCKET,
				Key: key,
				ContentType: "video/mp4",
			}),
			{ expiresIn: 3600 },
		);

		const uploadResponse = await fetch(uploadUrl, {
			method: "PUT",
			body: videoContent,
			headers: { "Content-Type": "video/mp4" },
		});
		expect(uploadResponse.ok).toBe(true);

		const head = await client.send(
			new HeadObjectCommand({ Bucket: BUCKET, Key: key }),
		);
		expect(head.$metadata.httpStatusCode).toBe(200);
		expect(head.ContentLength).toBe(videoContent.length);

		const downloadUrl = await getSignedUrl(
			client,
			new GetObjectCommand({ Bucket: BUCKET, Key: key }),
			{ expiresIn: 3600 },
		);

		const downloadResponse = await fetch(downloadUrl);
		expect(downloadResponse.ok).toBe(true);
		const body = await downloadResponse.arrayBuffer();
		expect(Buffer.from(body).toString()).toBe("fake-mp4-video-bytes");
	});
});
