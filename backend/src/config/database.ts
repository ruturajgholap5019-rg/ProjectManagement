import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(env.DATABASE_URL, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
    });

    isConnected = true;
    logger.info(`📦 MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('📦 MongoDB disconnected successfully.');
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('⚠️ MongoDB connection lost. Reconnecting...');
});

mongoose.connection.on('error', (err) => {
  logger.error('❌ MongoDB runtime error:', err);
});
