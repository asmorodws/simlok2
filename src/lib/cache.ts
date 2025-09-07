/**
 * Redis Cache Helper with namespacing and TTL support
 */

import { redisPub as redis } from './singletons';

const CACHE_PREFIX = 'app:v1';

interface CacheOptions {
  ttl?: number; // TTL in seconds
  namespace?: string;
}

export class Cache {
  private static getKey(key: string, namespace?: string): string {
    const ns = namespace ? `:${namespace}` : '';
    return `${CACHE_PREFIX}${ns}:${key}`;
  }

  /**
   * Get JSON value from cache
   */
  static async getJSON<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const fullKey = this.getKey(key, options.namespace);
      const value = await redis.get(fullKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Cache.getJSON error:', error);
      return null;
    }
  }

  /**
   * Set JSON value in cache with optional TTL
   */
  static async setJSON(
    key: string, 
    value: any, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.namespace);
      const serialized = JSON.stringify(value);
      
      if (options.ttl) {
        await redis.setex(fullKey, options.ttl, serialized);
      } else {
        await redis.set(fullKey, serialized);
      }
      
      return true;
    } catch (error) {
      console.warn('Cache.setJSON error:', error);
      return false;
    }
  }

  /**
   * Get string value from cache
   */
  static async get(key: string, options: CacheOptions = {}): Promise<string | null> {
    try {
      const fullKey = this.getKey(key, options.namespace);
      return await redis.get(fullKey);
    } catch (error) {
      console.warn('Cache.get error:', error);
      return null;
    }
  }

  /**
   * Set string value in cache with optional TTL
   */
  static async set(
    key: string, 
    value: string, 
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.namespace);
      
      if (options.ttl) {
        await redis.setex(fullKey, options.ttl, value);
      } else {
        await redis.set(fullKey, value);
      }
      
      return true;
    } catch (error) {
      console.warn('Cache.set error:', error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  static async del(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.namespace);
      await redis.del(fullKey);
      return true;
    } catch (error) {
      console.warn('Cache.del error:', error);
      return false;
    }
  }

  /**
   * Invalidate cache by prefix pattern
   */
  static async invalidateByPrefix(prefix: string, namespace?: string): Promise<number> {
    try {
      const pattern = this.getKey(`${prefix}*`, namespace);
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) return 0;
      
      await redis.del(...keys);
      return keys.length;
    } catch (error) {
      console.warn('Cache.invalidateByPrefix error:', error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.namespace);
      const result = await redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.warn('Cache.exists error:', error);
      return false;
    }
  }

  /**
   * Increment a numeric value
   */
  static async incr(key: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullKey = this.getKey(key, options.namespace);
      const result = await redis.incr(fullKey);
      
      // Set TTL if specified and this is a new key
      if (options.ttl && result === 1) {
        await redis.expire(fullKey, options.ttl);
      }
      
      return result;
    } catch (error) {
      console.warn('Cache.incr error:', error);
      return 0;
    }
  }

  /**
   * Set TTL for existing key
   */
  static async expire(key: string, ttl: number, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, options.namespace);
      const result = await redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      console.warn('Cache.expire error:', error);
      return false;
    }
  }
}

// Predefined namespaces for different features
export const CacheNamespaces = {
  STATS: 'stats',
  NOTIFICATIONS: 'notifications',
  SUBMISSIONS: 'submissions',
  VENDORS: 'vendors',
  AUTH: 'auth',
} as const;

// Common TTL values (in seconds)
export const CacheTTL = {
  SHORT: 60,      // 1 minute
  MEDIUM: 300,    // 5 minutes
  LONG: 900,      // 15 minutes
  HOUR: 3600,     // 1 hour
  DAY: 86400,     // 24 hours
} as const;
