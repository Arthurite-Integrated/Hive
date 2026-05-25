import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env.development", override: "true" });

const boolStr = z
	.enum(["true", "false", "1", "0"])
	.default("false")
	.transform((v) => v === "true" || v === "1");

const EnvSchema = z.object({
	PORT: z.coerce.number(),
	MONGO_URI: z.string(),
	REDIS_URI: z.string(),
	HOSTNAME: z.string(),
	JWT_PRIVATE_KEY: z.string(),
	JWT_PUBLIC_KEY: z.string(),
	JWT_EXPIRES_IN: z.string(),
	JWT_ISSUER: z.string().default("Hive"),
	REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
	NODE_ENV: z.string(),
	SERVER_DOMAIN: z.string(),
	ROOT_DOMAIN: z.string(),

	GMAIL_HOST: z.string(),
	GMAIL_PORT_SSL: z.coerce.number(),
	GMAIL_PORT_TLS: z.coerce.number(),
	GMAIL_USER: z.string(),
	GMAIL_PASSWORD: z.string(),
	GMAIL_SECURE: z.boolean().default(true),

	HOSTINGER_HOST: z.string(),
	HOSTINGER_PORT_SSL: z.coerce.number(),
	HOSTINGER_PORT_TLS: z.coerce.number(),
	HOSTINGER_USER: z.string(),
	HOSTINGER_PASSWORD: z.string(),
	HOSTINGER_SECURE: z.boolean().default(true),

	ENCRYPTION_KEY: z.string(),

	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),
	GOOGLE_REDIRECT_URI: z.string(),

	FACEBOOK_CLIENT_ID: z.string(),
	FACEBOOK_CLIENT_SECRET: z.string(),
	FACEBOOK_CONFIG_ID: z.string(),
	FACEBOOK_REDIRECT_URI: z.string().optional(),

	AWS_REGION: z.string(),
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	AWS_S3_BUCKET: z.string(),
	AWS_S3_BUCKET_PRIVATE: z.string().optional(),
	AWS_S3_ENDPOINT: z.string().optional(),
	AWS_CLOUDFRONT_DOMAIN: z.string().optional(),
	AWS_CLOUDFRONT_KEY_PAIR_ID: z.string().optional(),
	AWS_CLOUDFRONT_PRIVATE_KEY: z.string().optional(),
	AWS_MEDIACONVERT_ENDPOINT: z.string().optional(),
	AWS_MEDIACONVERT_ROLE_ARN: z.string().optional(),

	PAYSTACK_SECRET_KEY: z.string().optional(),
	PAYSTACK_PUBLIC_KEY: z.string().optional(),
	PAYSTACK_WEBHOOK_SECRET: z.string().optional(),

	FLW_SECRET_KEY: z.string().optional(),
	FLW_PUBLIC_KEY: z.string().optional(),
	FLW_WEBHOOK_HASH: z.string().optional(),

	STRIPE_SECRET_KEY: z.string().optional(),
	STRIPE_PUBLIC_KEY: z.string().optional(),
	STRIPE_WEBHOOK_SECRET: z.string().optional(),

	FCM_SERVER_KEY: z.string().optional(),
	FCM_SERVICE_ACCOUNT_JSON: z.string().optional(),
	TERMII_API_KEY: z.string().optional(),

	RESEND_API_KEY: z.string().optional(),
	RESEND_EMAIL: z.string().optional(),

	FEATURE_PAYMENTS: boolStr,
	FEATURE_LIVE_CLASSES: boolStr,
	FEATURE_CERTIFICATES: boolStr,
	FEATURE_REFERRALS: boolStr,
});

export const env = EnvSchema.parse(process.env);
