import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';
import { cacheHits, cacheMisses } from './metrics';

let redisClient: Redis | null = null;
const inMemoryCache = new Map<string, { value: any; expiresAt: number }>();
const DEFAULT_TTL = 300; // 5 minutes

// Initialize Redis if available, otherwise use in-memory cache
export async function initializeCache(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      redisClient = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      redisClient.on('error', (err) => {
        logger.warn({ err }, 'Redis connection error, falling back to in-memory cache');
        redisClient = null;
      });

      redisClient.on('connect', () => {
        logger.info('Redis cache connected');
      });

      await redisClient.ping();
      logger.info('Using Redis for caching');
    } catch (err) {
      logger.warn({ err }, 'Failed to connect to Redis, using in-memory cache');
      redisClient = null;
    }
  } else {
    logger.info('No REDIS_URL provided, using in-memory cache');
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const cacheKey = `contacts:${key}`;

  try {
    if (redisClient) {
      const value = await redisClient.get(cacheKey);
      if (value) {
        cacheHits.inc({ key_prefix: 'contacts' });
        return JSON.parse(value) as T;
      }
      cacheMisses.inc({ key_prefix: 'contacts' });
      return null;
    } else {
      // In-memory cache
      const cached = inMemoryCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        cacheHits.inc({ key_prefix: 'contacts' });
        return cached.value as T;
      }
      if (cached) {
        inMemoryCache.delete(cacheKey);
      }
      cacheMisses.inc({ key_prefix: 'contacts' });
      return null;
    }
  } catch (err) {
    logger.warn({ err, key }, 'Cache get error');
    return null;
  }
}

export async function setCache(key: string, value: any, ttl: number = DEFAULT_TTL): Promise<void> {
  const cacheKey = `contacts:${key}`;

  try {
    if (redisClient) {
      await redisClient.setex(cacheKey, ttl, JSON.stringify(value));
    } else {
      // In-memory cache
      inMemoryCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });
    }
  } catch (err) {
    logger.warn({ err, key }, 'Cache set error');
  }
}

export async function deleteCache(pattern: string): Promise<void> {
  try {
    if (redisClient) {
      const keys = await redisClient.keys(`contacts:${pattern}*`);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } else {
      // In-memory cache
      for (const key of inMemoryCache.keys()) {
        if (key.startsWith(`contacts:${pattern}`)) {
          inMemoryCache.delete(key);
        }
      }
    }
  } catch (err) {
    logger.warn({ err, pattern }, 'Cache delete error');
  }
}

export async function clearCache(): Promise<void> {
  try {
    if (redisClient) {
      const keys = await redisClient.keys('contacts:*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } else {
      // In-memory cache
      for (const key of inMemoryCache.keys()) {
        if (key.startsWith('contacts:')) {
          inMemoryCache.delete(key);
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, 'Cache clear error');
  }
}

export async function closeCache(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  inMemoryCache.clear();
}



