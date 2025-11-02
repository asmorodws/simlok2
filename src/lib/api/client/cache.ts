/**
 * Simple in-memory cache untuk API responses
 * Mengurangi beban server dengan menyimpan hasil API call sementara
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 menit default

  /**
   * Set cache dengan custom TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * Get cache jika masih valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Cek apakah cache sudah expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Hapus cache tertentu
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Hapus semua cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Hapus cache yang sudah expired
   */
  cleanExpired(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate cache berdasarkan pattern
   * Contoh: invalidatePattern('/api/submissions') akan menghapus semua cache yang mengandung '/api/submissions'
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    // Delete in batch to avoid iterator issues
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    console.log(`[ApiCache] Invalidated ${keysToDelete.length} cache entries matching: ${pattern}`);
  }

  /**
   * Check if a request is currently pending
   */
  hasPendingRequest(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * Get pending request promise
   */
  getPendingRequest<T>(key: string): Promise<T> | undefined {
    return this.pendingRequests.get(key);
  }

  /**
   * Set pending request
   */
  setPendingRequest(key: string, promise: Promise<any>): void {
    this.pendingRequests.set(key, promise);
  }

  /**
   * Clear pending request
   */
  clearPendingRequest(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Get cache stats
   */
  getStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      total: this.cache.size,
      valid: validCount,
      expired: expiredCount,
    };
  }
}

// Singleton instance
export const apiCache = new ApiCache();

// Clean expired cache setiap 10 menit
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanExpired();
  }, 10 * 60 * 1000);
}

/**
 * Wrapper fetch dengan cache dan request deduplication
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit & { cacheTTL?: number; skipCache?: boolean }
): Promise<T> {
  const { cacheTTL, skipCache, ...fetchOptions } = options || {};
  
  // Skip cache untuk POST, PUT, DELETE, PATCH
  const method = fetchOptions.method?.toUpperCase() || 'GET';
  if (skipCache || method !== 'GET') {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }

  // Cek cache key
  const cacheKey = `${url}`;
  
  // Cek apakah ada request yang sedang pending untuk URL yang sama
  const pendingRequest = apiCache.getPendingRequest<T>(cacheKey);
  if (pendingRequest) {
    console.log(`[ApiCache] Reusing pending request for: ${url}`);
    return pendingRequest;
  }
  
  // Cek cache
  const cached = apiCache.get<T>(cacheKey);
  if (cached !== null) {
    console.log(`[ApiCache] Cache hit for: ${url}`);
    return cached;
  }

  console.log(`[ApiCache] Cache miss, fetching: ${url}`);
  
  // Buat promise untuk fetch
  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Simpan ke cache
      apiCache.set(cacheKey, data, cacheTTL);
      
      return data;
    } finally {
      // Clear pending request setelah selesai (success atau error)
      apiCache.clearPendingRequest(cacheKey);
    }
  })();

  // Simpan promise sebagai pending request
  apiCache.setPendingRequest(cacheKey, fetchPromise);
  
  return fetchPromise;
}
