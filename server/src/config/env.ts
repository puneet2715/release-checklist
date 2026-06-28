import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().optional(),
  CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(60),
  // Comma-separated allow-list of browser origins. Empty => allow all (dev).
  WEB_ORIGIN: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins: string[] | boolean = env.WEB_ORIGIN
  ? env.WEB_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : true;
