import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_URL = process.env.REDIS_URL || `redis://${REDIS_HOST}:${REDIS_PORT}`;

let redisClient: Redis | null = null;
let isRedisConnected = false;

try {
  redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('⚠️ Redis connection attempts exceeded. Operating in graceful fallback mode.');
        return null;
      }
      return Math.min(times * 100, 2000);
    },
    lazyConnect: true,
  });

  redisClient
    .connect()
    .then(() => {
      isRedisConnected = true;
      logger.info('⚡ Redis Cache Engine connected successfully.');
    })
    .catch((err) => {
      isRedisConnected = false;
      logger.warn(`⚠️ Redis offline (Graceful fallback active): ${err.message}`);
    });

  redisClient.on('error', () => {
    isRedisConnected = false;
  });
} catch (err: any) {
  logger.warn(`⚠️ Redis initialization skipped: ${err.message}`);
}

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!redisClient || !isRedisConnected) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, data: any, ttlSeconds: number = 60): Promise<void> => {
  if (!redisClient || !isRedisConnected) return;
  try {
    await redisClient.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch {
    // Graceful fallback
  }
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  if (!redisClient || !isRedisConnected) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch {
    // Graceful fallback
  }
};

export { redisClient, isRedisConnected };
