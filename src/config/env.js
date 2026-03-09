import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env.development" });

const EnvSchema = z.object({
	PORT: z.coerce.number(),
	MONGO_URI: z.string(),
	REDIS_URI: z.string(),
	HOSTNAME: z.string(),
	JWT_PRIVATE_KEY: z.string(),
	JWT_PUBLIC_KEY: z.string(),
	JWT_EXPIRES_IN: z.string(),
	NODE_ENV: z.string(),
	SERVER_DOMAIN: z.string(),
	ROOT_DOMAIN: z.string(),

	RESEND_API_KEY: z.string(),
	RESEND_EMAIL: z.string(),

	ENCRYPTION_KEY: z.string(),

	GOOGLE_CLIENT_ID: z.string(),
	GOOGLE_CLIENT_SECRET: z.string(),
	GOOGLE_REDIRECT_URI: z.string(),

	FACEBOOK_CLIENT_ID: z.string(),
	FACEBOOK_CLIENT_SECRET: z.string(),
});

export const env = EnvSchema.parse(process.env);
