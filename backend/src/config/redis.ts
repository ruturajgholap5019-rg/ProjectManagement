import { Redis } from 'ioredis';
import { env } from './env.js';

interface CacheEntry {
  data: any;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

let redisClientInstance: Redis | null = null;
let isRedisReady = false;

const redisUrl = env.REDIS_URL || process.env.REDIS_URL;

if (redisUrl) {
  try {
    redisClientInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('⚠️ Redis connection failed. Falling back to in-memory cache.');
          return null;
        }
        return Math.min(times * 100, 1000);
      },
      lazyConnect: true,
    });

    redisClientInstance.connect().then(() => {
      isRedisReady = true;
      console.log('✅ Connected to real Redis instance for distributed caching.');
    }).catch((err) => {
      console.warn('⚠️ Could not connect to Redis at startup. In-memory cache active.', err?.message);
    });

    redisClientInstance.on('error', (err) => {
      isRedisReady = false;
    });

    redisClientInstance.on('ready', () => {
      isRedisReady = true;
    });
  } catch (err) {
    console.warn('⚠️ Redis initialization error, using in-memory cache.');
  }
}

export const redisClient = redisClientInstance;
export const isRedisConnected = () => isRedisReady;

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (isRedisReady && redisClientInstance) {
    try {
      const raw = await redisClientInstance.get(key);
      if (raw) return JSON.parse(raw) as T;
      return null;
    } catch {
      // Fall through to memory
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
  if (isRedisReady && redisClientInstance) {
    try {
      await redisClientInstance.set(key, JSON.stringify(data), 'EX', ttlSeconds);
      return;
    } catch {
      // Fall through to memory
    }
  }

  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  if (isRedisReady && redisClientInstance) {
    try {
      const keys = await redisClientInstance.keys(pattern);
      if (keys.length > 0) {
        await redisClientInstance.del(...keys);
      }
    } catch {
      // Fall through to memory
    }
  }

  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}`);
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
};
