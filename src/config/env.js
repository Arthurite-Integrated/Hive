import { z } from 'zod'
import { config } from 'dotenv';

config({ path: '.env.development' });

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

  /** @info - Email Credentials */
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

  APPLE_CLIENT_ID: z.string(),
  APPLE_TEAM_ID: z.string(),
  APPLE_KEY_ID: z.string(),
  APPLE_PRIVATE_KEY: z.string(),
  APPLE_REDIRECT_URI: z.string(),
})

export const env = EnvSchema.parse(process.env);