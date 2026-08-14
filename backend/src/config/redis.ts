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

interface CacheEntry {
  data: any;
  expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry>();

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (redisClient && isRedisConnected) {
    try {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data);
    } catch {
      // Fallback to memory cache
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
};

export const cacheSet = async (key: string, data: any, ttlSeconds: number = 30): Promise<void> => {
  if (redisClient && isRedisConnected) {
    try {
      await redisClient.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } catch {
      // Fallback to memory cache
    }
  }

  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  if (redisClient && isRedisConnected) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch {
      // Fallback to memory cache
    }
  }

  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}`);
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
};

export { redisClient, isRedisConnected };
