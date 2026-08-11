import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MAX_FILE_SIZE_BYTES: z.string().default('52428800').transform((val) => parseInt(val, 10)),
  UPLOAD_DIR: z.string().default('./uploads'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(JSON.stringify(_env.error.format(), null, 2));
  process.exit(1);
}

export const env = _env.data;
