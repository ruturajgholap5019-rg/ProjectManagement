import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z
    .union([z.string(), z.number()])
    .default(process.env.PORT || '3001')
    .transform((val) => (typeof val === 'number' ? val : parseInt(val, 10) || 3001)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string()
    .default(process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/project_management'),
  JWT_ACCESS_SECRET: z
    .string()
    .default('project_tracker_default_jwt_access_secret_key_32_chars_secure'),
  JWT_REFRESH_SECRET: z
    .string()
    .default('project_tracker_default_jwt_refresh_secret_key_32_chars_secure'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  MAX_FILE_SIZE_BYTES: z
    .union([z.string(), z.number()])
    .default(52428800)
    .transform((val) => (typeof val === 'number' ? val : parseInt(val, 10) || 52428800)),
  UPLOAD_DIR: z.string().default('./uploads'),
});

const rawEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/project_management',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'project_tracker_default_jwt_access_secret_key_32_chars_secure',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'project_tracker_default_jwt_refresh_secret_key_32_chars_secure',
};

const _env = envSchema.safeParse(rawEnv);

if (!_env.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(JSON.stringify(_env.error.format(), null, 2));
  process.exit(1);
}

export const env = _env.data;
