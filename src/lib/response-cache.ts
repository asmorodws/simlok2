/**
 * Response Caching System
 * 
 * Implementasi caching untuk response API dengan:
 * - TTL (Time To Live)
 * - Tag-based invalidation
 * - Memory management
 * - LRU eviction policy
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

class ResponseCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;
  private accessOrder: Map<string, number>;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = new Map();
  }

  /**
   * Set cache dengan TTL dan tags
   */
  set<T>(
    key: string,
    data: T,
    ttlMs: number = 60000, // Default 1 menit
    tags: string[] = []
  ): void {
    // Evict jika sudah penuh (LRU)
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
      tags,
    });

    this.accessOrder.set(key, Date.now());
  }

  /**
   * Get cache (return null jika expired atau tidak ada)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // Update access time
    this.accessOrder.set(key, Date.now());

    return entry.data as T;
  }

  /**
   * Invalidate by key
   */
  delete(key: string): boolean {
    this.accessOrder.delete(key);
    return this.cache.delete(key);
  }

  /**
   * Invalidate by tag
   */
  invalidateByTag(tag: string): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate by tags (multiple)
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;

    for (const tag of tags) {
      invalidated += this.invalidateByTag(tag);
    }

    return invalidated;
  }

  /**
   * Clear semua cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
    };
  }

  /**
   * Evict Least Recently Used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Singleton instance
export const responseCache = new ResponseCache(1000);

// Auto-cleanup expired entries setiap 5 menit
if (typeof window === 'undefined') {
  setInterval(() => {
    const cleaned = responseCache.cleanExpired();
    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }, 5 * 60 * 1000);
}

/**
 * Cache TTL presets
 */
export const CacheTTL = {
  SHORT: 30 * 1000,        // 30 detik
  MEDIUM: 60 * 1000,       // 1 menit
  LONG: 5 * 60 * 1000,     // 5 menit
  VERY_LONG: 15 * 60 * 1000, // 15 menit
  HOUR: 60 * 60 * 1000,    // 1 jam
} as const;

/**
 * Cache tags untuk invalidation
 */
export const CacheTags = {
  SUBMISSIONS: 'submissions',
  SUBMISSION_DETAIL: 'submission-detail',
  SUBMISSION_STATS: 'submission-stats',
  USER: 'user',
  NOTIFICATIONS: 'notifications',
  DASHBOARD: 'dashboard',
  APPROVER_STATS: 'approver-stats',
  REVIEWER_STATS: 'reviewer-stats',
  VENDOR_STATS: 'vendor-stats',
  VISITOR_STATS: 'visitor-stats',
  QR_SCANS: 'qr-scans',
} as const;

/**
 * Helper untuk generate cache key
 */
export function generateCacheKey(
  prefix: string,
  params: Record<string, any>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `${prefix}:${sortedParams}`;
}

/**
 * Decorator untuk cache API response
 */
export function withCache<T>(
  fn: () => Promise<T>,
  cacheKey: string,
  ttl: number = CacheTTL.MEDIUM,
  tags: string[] = []
): Promise<T> {
  // Check cache first
  const cached = responseCache.get<T>(cacheKey);
  if (cached !== null) {
    console.log(`✨ Cache HIT: ${cacheKey}`);
    return Promise.resolve(cached);
  }

  console.log(`🔍 Cache MISS: ${cacheKey}`);

  // Execute function and cache result
  return fn().then(result => {
    responseCache.set(cacheKey, result, ttl, tags);
    return result;
  });
}
