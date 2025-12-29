import { z } from 'zod'
import { config } from 'dotenv';

config({ path: '.env' });

const EnvSchema = z.object({
  PORT: z.coerce.number(),
  MONGO_URI: z.string(),
  HOSTNAME: z.string(),
})

export const env = EnvSchema.parse(process.env);