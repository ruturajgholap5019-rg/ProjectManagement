interface CacheEntry {
  data: any;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
};

export const cacheSet = async (key: string, data: any, ttlSeconds: number = 30): Promise<void> => {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export const cacheDelPattern = async (pattern: string): Promise<void> => {
  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}`);
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }
};

export const redisClient = null;
export const isRedisConnected = false;
