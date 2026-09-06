import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

// In production, JWT secrets MUST be explicitly set and must be >= 32 chars.
// In development, a safe local fallback is used so devs don't need to configure secrets.
const jwtSecretSchema = isProduction
  ? z.string().min(32, 'JWT secret must be at least 32 characters')
  : z.string().min(1).default('dev_jwt_access_secret_key_for_local_use_only_32ch');

const jwtRefreshSecretSchema = isProduction
  ? z.string().min(32, 'JWT refresh secret must be at least 32 characters')
  : z.string().min(1).default('dev_jwt_refresh_secret_key_for_local_use_only_32ch');

const envSchema = z.object({
  PORT: z
    .union([z.string(), z.number()])
    .default(process.env.PORT || '3001')
    .transform((val) => (typeof val === 'number' ? val : parseInt(val, 10) || 3001)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string()
    .default(process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/project_management'),
  JWT_ACCESS_SECRET: jwtSecretSchema,
  JWT_REFRESH_SECRET: jwtRefreshSecretSchema,
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  MAX_FILE_SIZE_BYTES: z
    .union([z.string(), z.number()])
    .default(52428800)
    .transform((val) => (typeof val === 'number' ? val : parseInt(val, 10) || 52428800)),
  UPLOAD_DIR: z.string().default('./uploads'),
  REDIS_URL: z.string().optional(),
});

const rawEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/project_management',
};

const _env = envSchema.safeParse(rawEnv);

if (!_env.success) {
  console.error('❌ Invalid or missing environment variables:');
  console.error(JSON.stringify(_env.error.format(), null, 2));
  if (isProduction) {
    console.error('🔴 PRODUCTION STARTUP BLOCKED — Fix the above env vars before deploying.');
  }
  process.exit(1);
}

export const env = _env.data;
