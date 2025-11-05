/**
 * Rate Limiter for API endpoints
 * Prevents abuse and ensures fair resource allocation
 * 
 * Uses in-memory store with LRU eviction
 * For production with multiple servers, consider Redis-based rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private maxStoreSize = 10000; // Prevent memory overflow
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   * Returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(
    identifier: string,
    config: RateLimitConfig
  ): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    // No previous entry or window expired
    if (!entry || entry.resetTime < now) {
      const resetTime = now + config.windowMs;
      this.store.set(identifier, {
        count: 1,
        resetTime,
      });

      // Evict oldest entries if store is too large
      if (this.store.size > this.maxStoreSize) {
        const firstKey = this.store.keys().next().value;
        if (firstKey) this.store.delete(firstKey);
      }

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    // Within window, check limit
    if (entry.count < config.maxRequests) {
      entry.count++;
      this.store.set(identifier, entry);

      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000), // seconds
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        toDelete.push(key);
      }
    }

    toDelete.forEach((key) => this.store.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`🧹 Rate limiter cleanup: removed ${toDelete.length} expired entries`);
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear() {
    this.store.clear();
  }

  /**
   * Destroy rate limiter (cleanup interval)
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Predefined rate limit configurations
export const RateLimitPresets = {
  // Upload API: 20 uploads per minute per user
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    message: 'Terlalu banyak upload. Mohon tunggu sebentar.',
  },

  // Submission API: 5 submissions per 5 minutes per user
  submission: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5,
    message: 'Terlalu banyak pengajuan. Mohon tunggu beberapa menit.',
  },

  // General API: 100 requests per minute per user
  general: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Terlalu banyak permintaan. Mohon tunggu sebentar.',
  },

  // Auth API: 5 login attempts per 15 minutes per IP
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Terlalu banyak percobaan login. Mohon tunggu 15 menit.',
  },
} as const;

/**
 * Helper to get rate limit headers
 */
export function getRateLimitHeaders(result: {
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}): HeadersInit {
  const headers: HeadersInit = {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = result.retryAfter.toString();
  }

  return headers;
}
