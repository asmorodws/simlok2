/**
 * API Caching Helper Functions
 * 
 * Provides reusable caching utilities for API routes to reduce boilerplate
 * and ensure consistent caching patterns across the application.
 * 
 * @example
 * ```typescript
 * export async function GET() {
 *   const session = await getServerSession(authOptions);
 *   if (!session?.user) {
 *     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 * 
 *   const { data, cached } = await withCache(
 *     CacheKeys.REVIEWER_STATS,
 *     CacheTTL.ONE_MINUTE,
 *     () => fetchReviewerStats(session.user.id)
 *   );
 * 
 *   return NextResponse.json(data, {
 *     headers: { 'X-Cache': cached ? 'HIT' : 'MISS' }
 *   });
 * }
 * ```
 */

import cache from '@/lib/cache';

/**
 * Cache result interface
 */
export interface CacheResult<T> {
  data: T;
  cached: boolean;
}

/**
 * Wraps a data fetching function with caching logic
 * 
 * @param cacheKey - Unique key for this cache entry
 * @param ttl - Time to live in seconds
 * @param fetchFn - Async function that fetches the data
 * @returns Promise with data and cache status
 */
export async function withCache<T>(
  cacheKey: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<CacheResult<T>> {
  // Try to get from cache
  const cached = cache.get<T>(cacheKey);
  
  if (cached !== undefined && cached !== null) {
    return { data: cached, cached: true };
  }
  
  // Cache miss - fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  cache.set(cacheKey, data, ttl);
  
  return { data, cached: false };
}

/**
 * Wraps a data fetching function with user-specific caching
 * Creates a cache key with user ID to prevent cache collisions
 * 
 * @param baseKey - Base cache key
 * @param userId - User ID for cache isolation
 * @param ttl - Time to live in seconds
 * @param fetchFn - Async function that fetches the data
 * @returns Promise with data and cache status
 */
export async function withUserCache<T>(
  baseKey: string,
  userId: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<CacheResult<T>> {
  const cacheKey = `${baseKey}:${userId}`;
  return withCache(cacheKey, ttl, fetchFn);
}

/**
 * Invalidates cache for a specific key
 * 
 * @param cacheKey - Key to invalidate
 */
export function invalidateCache(cacheKey: string): void {
  cache.delete(cacheKey);
}

/**
 * Invalidates all cache entries matching a pattern
 * Useful for invalidating all user-specific caches
 * 
 * @param pattern - Pattern to match (e.g., "user:stats:*")
 */
export function invalidateCachePattern(pattern: string): void {
  const keys = cache.keys();
  const regex = new RegExp(pattern.replace('*', '.*'));
  
  keys.forEach((key: string) => {
    if (regex.test(key)) {
      cache.delete(key);
    }
  });
}

/**
 * Creates a cache key builder for consistent key generation
 * 
 * @example
 * ```typescript
 * const buildKey = createCacheKeyBuilder('dashboard:stats');
 * const key = buildKey(userId, 'pending'); // "dashboard:stats:user123:pending"
 * ```
 */
export function createCacheKeyBuilder(prefix: string) {
  return (...parts: (string | number)[]): string => {
    return [prefix, ...parts].join(':');
  };
}

/**
 * Wrapper for API responses with cache headers
 * 
 * @param data - Response data
 * @param cached - Whether data came from cache
 * @param status - HTTP status code
 * @returns NextResponse with cache headers
 */
export function createCachedResponse<T>(
  data: T,
  cached: boolean,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Cache': cached ? 'HIT' : 'MISS',
      'Cache-Control': cached ? 'private, max-age=60' : 'private, no-cache',
    },
  });
}
