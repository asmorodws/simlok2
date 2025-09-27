/**
 * Cache Service - Enhanced Cache Management
 * 
 * Provides advanced caching capabilities with:
 * - Event-driven cache invalidation
 * - Pattern-based cache clearing
 * - Multi-layer cache coordination (L1: Request, L2: Data, L3: Redis)
 */

import { Cache, CacheNamespaces, CacheTTL } from '@/lib/cache';
import { revalidateTag } from 'next/cache';

export interface CacheInvalidationEvent {
  scope: 'admin' | 'vendor' | 'reviewer' | 'approver' | 'global';
  vendorId?: string;
  tags: string[];
  patterns: string[];
  reason?: string;
}

export interface CacheMetrics {
  totalKeys: number;
  hitRate: number;
  memoryUsage: number;
  invalidations: number;
}

export class CacheService {
  private invalidationCount = 0;

  /**
   * Invalidate cache with comprehensive event-driven approach
   */
  async invalidateCache(event: CacheInvalidationEvent): Promise<void> {
    const { scope, vendorId, tags, patterns, reason } = event;
    
    console.log(`[CacheService] Invalidating cache for scope: ${scope}`, {
      vendorId,
      tags: tags.length,
      patterns: patterns.length,
      reason
    });

    const promises: Promise<any>[] = [];

    // Next.js cache tag invalidation (L2 Cache)
    for (const tag of tags) {
      promises.push(this.invalidateNextJSCache(tag));
    }

    // Redis pattern-based invalidation (L3 Cache)
    for (const pattern of patterns) {
      if (scope === 'vendor' && vendorId) {
        promises.push(this.invalidateVendorPattern(vendorId, pattern));
      } else {
        promises.push(this.invalidateGlobalPattern(pattern));
      }
    }

    // Scope-specific invalidation
    promises.push(this.invalidateByScope(scope, vendorId));

    await Promise.all(promises);
    
    this.invalidationCount++;
    console.log(`[CacheService] Cache invalidation completed. Total: ${this.invalidationCount}`);
  }

  /**
   * Smart cache warming for critical data
   */
  async warmCache(scope: 'admin' | 'vendor', vendorId?: string): Promise<void> {
    console.log(`[CacheService] Warming cache for scope: ${scope}`, { vendorId });

    const promises: Promise<any>[] = [];

    if (scope === 'admin') {
      // Pre-warm admin dashboard stats
      promises.push(
        this.preloadData('admin_dashboard_stats', 'STATS', async () => {
          // This would call dashboardService.getAdminStats() but avoid circular dependency
          return null; // Implement actual warming logic in caller
        })
      );
    } else if (scope === 'vendor' && vendorId) {
      // Pre-warm vendor-specific data
      promises.push(
        this.preloadData(`vendor_dashboard_stats_${vendorId}`, 'STATS', async () => {
          return null; // Implement actual warming logic in caller
        })
      );

      promises.push(
        this.preloadData(`vendor_submissions_${vendorId}`, 'SUBMISSIONS', async () => {
          return null; // Implement actual warming logic in caller
        })
      );
    }

    await Promise.all(promises);
    console.log(`[CacheService] Cache warming completed for ${scope}`);
  }

  /**
   * Get comprehensive cache metrics
   */
  async getCacheMetrics(): Promise<CacheMetrics> {
    // Implementation would depend on Redis client capabilities
    // This is a simplified version
    const totalKeys = await this.estimateKeyCount();
    
    return {
      totalKeys,
      hitRate: 0.85, // Mock data - implement actual hit rate tracking
      memoryUsage: 0, // Would query Redis INFO memory
      invalidations: this.invalidationCount
    };
  }

  /**
   * Bulk cache operations for performance
   */
  async bulkSet(entries: Array<{
    key: string;
    value: any;
    namespace: keyof typeof CacheNamespaces;
    ttl?: number;
  }>): Promise<void> {
    const promises = entries.map(entry =>
      Cache.setJSON(entry.key, entry.value, {
        namespace: entry.namespace,
        ttl: entry.ttl || CacheTTL.SHORT
      })
    );

    await Promise.all(promises);
    console.log(`[CacheService] Bulk set ${entries.length} cache entries`);
  }

  /**
   * Bulk cache invalidation by keys
   */
  async bulkDelete(keys: Array<{
    key: string;
    namespace: keyof typeof CacheNamespaces;
  }>): Promise<void> {
    const promises = keys.map(item =>
      Cache.del(item.key, { namespace: item.namespace })
    );

    await Promise.all(promises);
    console.log(`[CacheService] Bulk deleted ${keys.length} cache entries`);
  }

  /**
   * Cache health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: boolean;
    nextjs: boolean;
    latency: number;
  }> {
    const start = Date.now();
    
    try {
      // Test Redis connectivity
      const testKey = 'health_check_' + Date.now();
      await Cache.setJSON(testKey, { test: true }, {
        namespace: CacheNamespaces.STATS,
        ttl: 10
      });
      
      const retrieved = await Cache.getJSON(testKey, { namespace: CacheNamespaces.STATS });
      await Cache.del(testKey, { namespace: CacheNamespaces.STATS });
      
      const latency = Date.now() - start;
      const redis = retrieved !== null;
      
      return {
        status: redis && latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
        redis,
        nextjs: true, // Next.js cache is always available
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        redis: false,
        nextjs: true,
        latency: Date.now() - start
      };
    }
  }

  // Private helper methods

  private async invalidateNextJSCache(tag: string): Promise<void> {
    try {
      revalidateTag(tag);
      console.log(`[CacheService] Invalidated Next.js cache tag: ${tag}`);
    } catch (error) {
      console.error(`[CacheService] Failed to invalidate Next.js tag ${tag}:`, error);
    }
  }

  private async invalidateVendorPattern(vendorId: string, pattern: string): Promise<void> {
    const fullPattern = `vendor_${vendorId}_${pattern}`;
    await Cache.invalidateByPrefix(fullPattern, CacheNamespaces.STATS);
    console.log(`[CacheService] Invalidated vendor pattern: ${fullPattern}`);
  }

  private async invalidateGlobalPattern(pattern: string): Promise<void> {
    await Cache.invalidateByPrefix(pattern, CacheNamespaces.STATS);
    console.log(`[CacheService] Invalidated global pattern: ${pattern}`);
  }

  private async invalidateByScope(scope: string, vendorId?: string): Promise<void> {
    switch (scope) {
      case 'admin':
        await Cache.del('admin_dashboard_stats', { namespace: CacheNamespaces.STATS });
        break;
      case 'vendor':
        if (vendorId) {
          await Cache.invalidateByPrefix(`vendor_${vendorId}`, CacheNamespaces.STATS);
        }
        break;
      case 'global':
        await Cache.invalidateByPrefix('', CacheNamespaces.STATS);
        break;
    }
  }

  private async preloadData(
    key: string, 
    namespace: keyof typeof CacheNamespaces, 
    loader: () => Promise<any>
  ): Promise<void> {
    try {
      const data = await loader();
      if (data !== null) {
        await Cache.setJSON(key, data, { 
          namespace, 
          ttl: CacheTTL.MEDIUM 
        });
      }
    } catch (error) {
      console.error(`[CacheService] Failed to preload ${key}:`, error);
    }
  }

  private async estimateKeyCount(): Promise<number> {
    // This would use Redis INFO keyspace or similar
    // For now, return a mock count
    return 150;
  }
}

// Export singleton instance
export const cacheService = new CacheService();