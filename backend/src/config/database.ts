import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  const dbUrl = env.DATABASE_URL;

  if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
    const errorMsg =
      '❌ [DATABASE CONFIG ERROR] The backend has been upgraded to MongoDB (Mongoose), but the provided DATABASE_URL is a PostgreSQL connection string. Please update the DATABASE_URL or MONGODB_URI in your environment variables to a valid MongoDB connection string (e.g., mongodb+srv://<user>:<password>@cluster.mongodb.net/project_management).';
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      logger.info(`🔌 Connecting to MongoDB (Attempt ${attempt}/${maxRetries})...`);
      const conn = await mongoose.connect(dbUrl, {
        autoIndex: true,
        serverSelectionTimeoutMS: 15000,
      });

      isConnected = true;
      logger.info(`📦 MongoDB connected successfully: ${conn.connection.host}`);
      return conn;
    } catch (error: any) {
      logger.error(`❌ MongoDB connection attempt ${attempt} failed: ${error.message}`);
      if (attempt >= maxRetries) {
        throw error;
      }
      logger.info('⏳ Retrying MongoDB connection in 3 seconds...');
      await new Promise((res) => setTimeout(res, 3000));
    }
  }

  return mongoose;
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('📦 MongoDB disconnected successfully.');
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('⚠️ MongoDB connection lost.');
});

mongoose.connection.on('error', (err) => {
  logger.error('❌ MongoDB runtime error:', err);
});
