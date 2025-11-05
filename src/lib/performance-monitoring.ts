/**
 * Performance Monitoring Utilities
 * 
 * Provides tools for tracking and logging API performance metrics
 * to help identify bottlenecks and optimize slow endpoints.
 * 
 * @module performance-monitoring
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  route: string;
  method: string;
  duration: number;
  timestamp: Date;
  cacheStatus?: 'HIT' | 'MISS';
  dbQueryTime?: number;
  statusCode?: number;
  userId?: string;
}

/**
 * Performance thresholds (in milliseconds)
 */
const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY: 1000,      // Queries over 1s are considered slow
  VERY_SLOW_QUERY: 3000, // Queries over 3s are critical
  WARNING_LEVEL: 500,    // Warn if response > 500ms
} as const;

/**
 * Log performance metrics to console
 * In production, this should send to monitoring service (Sentry, DataDog, etc.)
 */
export function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  const { route, method, duration, cacheStatus, statusCode } = metrics;
  
  // Determine log level based on duration
  if (duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_QUERY) {
    console.error('🔴 CRITICAL SLOW REQUEST:', {
      ...metrics,
      threshold: 'VERY_SLOW',
    });
  } else if (duration > PERFORMANCE_THRESHOLDS.SLOW_QUERY) {
    console.warn('🟠 SLOW REQUEST:', {
      ...metrics,
      threshold: 'SLOW',
    });
  } else if (duration > PERFORMANCE_THRESHOLDS.WARNING_LEVEL) {
    console.warn('🟡 Warning - Slow response:', {
      route,
      method,
      duration: `${duration}ms`,
      cacheStatus,
      statusCode,
    });
  } else {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Performance:', {
        route,
        method,
        duration: `${duration}ms`,
        cacheStatus,
        statusCode,
      });
    }
  }
}

/**
 * Measure execution time of an async function
 */
export async function measureExecutionTime<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  
  if (duration > PERFORMANCE_THRESHOLDS.WARNING_LEVEL) {
    console.warn(`⏱️ ${label} took ${duration}ms`);
  }
  
  return { result, duration };
}

/**
 * Add performance headers to response
 */
export function addPerformanceHeaders(
  response: NextResponse,
  duration: number,
  cacheStatus?: 'HIT' | 'MISS'
): NextResponse {
  response.headers.set('X-Response-Time', `${duration}ms`);
  if (cacheStatus) {
    response.headers.set('X-Cache', cacheStatus);
  }
  response.headers.set('X-Performance-Category', getPerformanceCategory(duration));
  
  return response;
}

/**
 * Get performance category based on duration
 */
function getPerformanceCategory(duration: number): string {
  if (duration > PERFORMANCE_THRESHOLDS.VERY_SLOW_QUERY) return 'CRITICAL';
  if (duration > PERFORMANCE_THRESHOLDS.SLOW_QUERY) return 'SLOW';
  if (duration > PERFORMANCE_THRESHOLDS.WARNING_LEVEL) return 'WARNING';
  return 'FAST';
}

/**
 * Create a performance tracking wrapper for API routes
 * 
 * @example
 * ```typescript
 * export const GET = withPerformanceTracking(async (req) => {
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * });
 * ```
 */
export function withPerformanceTracking(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const route = new URL(req.url).pathname;
    const method = req.method;
    
    try {
      // Execute handler
      const response = await handler(req);
      
      // Calculate duration
      const duration = Date.now() - startTime;
      
      // Get cache status from response header
      const cacheStatus = response.headers.get('X-Cache') as 'HIT' | 'MISS' | null;
      
      // Log metrics
      const metrics: PerformanceMetrics = {
        route,
        method,
        duration,
        timestamp: new Date(),
        statusCode: response.status,
      };
      
      if (cacheStatus) {
        metrics.cacheStatus = cacheStatus;
      }
      
      logPerformanceMetrics(metrics);
      
      // Add performance headers
      return addPerformanceHeaders(response, duration, cacheStatus || undefined);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error('❌ Request failed:', {
        route,
        method,
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  };
}

/**
 * Database query performance tracker
 */
export class QueryPerformanceTracker {
  private queries: Array<{ query: string; duration: number }> = [];
  
  /**
   * Track a database query
   */
  async track<T>(queryName: string, query: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await query();
      const duration = Date.now() - startTime;
      
      this.queries.push({ query: queryName, duration });
      
      if (duration > PERFORMANCE_THRESHOLDS.SLOW_QUERY) {
        console.warn(`🐢 Slow database query: ${queryName} - ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Query failed: ${queryName} - ${duration}ms`, error);
      throw error;
    }
  }
  
  /**
   * Get total query time
   */
  getTotalTime(): number {
    return this.queries.reduce((sum, q) => sum + q.duration, 0);
  }
  
  /**
   * Get query statistics
   */
  getStats() {
    return {
      totalQueries: this.queries.length,
      totalTime: this.getTotalTime(),
      queries: this.queries,
      slowQueries: this.queries.filter(q => q.duration > PERFORMANCE_THRESHOLDS.WARNING_LEVEL),
    };
  }
}

/**
 * Export performance report (for debugging)
 */
export function generatePerformanceReport(tracker: QueryPerformanceTracker) {
  const stats = tracker.getStats();
  
  return {
    summary: {
      totalQueries: stats.totalQueries,
      totalTime: `${stats.totalTime}ms`,
      averageTime: stats.totalQueries > 0 
        ? `${(stats.totalTime / stats.totalQueries).toFixed(2)}ms` 
        : '0ms',
    },
    slowQueries: stats.slowQueries.map(q => ({
      query: q.query,
      duration: `${q.duration}ms`,
    })),
    allQueries: stats.queries.map(q => ({
      query: q.query,
      duration: `${q.duration}ms`,
    })),
  };
}
