/**
 * Database Connection Pool Manager
 * 
 * Mengelola connection pool untuk optimasi performa database:
 * - Connection pooling
 * - Connection lifecycle
 * - Health monitoring
 */

import { PrismaClient } from '@prisma/client';

/**
 * Optimized Prisma Client dengan connection pooling
 */
export function createOptimizedPrismaClient() {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn']
      : ['error'],
  });

  // Enable query logging di development
  if (process.env.NODE_ENV === 'development') {
    prisma.$on('query' as never, (e: any) => {
      if (e.duration > 1000) {
        console.warn(`⚠️ Slow query detected (${e.duration}ms):`, e.query);
      }
    });
  }

  return prisma;
}

/**
 * Connection health check
 */
export async function checkDatabaseConnection(prisma: PrismaClient): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Graceful disconnect
 */
export async function disconnectPrisma(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
}

/**
 * Connection pool stats
 */
export async function getConnectionPoolStats(prisma: PrismaClient) {
  try {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count 
      FROM information_schema.processlist 
      WHERE DB = DATABASE()
    `;
    
    return {
      activeConnections: Number(result[0]?.count || 0),
    };
  } catch (error) {
    console.error('Failed to get connection pool stats:', error);
    return {
      activeConnections: -1,
    };
  }
}

/**
 * Transaction wrapper dengan retry logic
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: any) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        maxWait: 5000, // 5 detik max wait
        timeout: 10000, // 10 detik timeout
      });
    } catch (error) {
      lastError = error as Error;
      console.warn(`Transaction attempt ${attempt} failed:`, error);

      // Retry dengan exponential backoff
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

/**
 * Batch operation helper
 */
export async function batchOperation<T, R>(
  items: T[],
  operation: (batch: T[]) => Promise<R[]>,
  batchSize: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await operation(batch);
    results.push(...batchResults);
  }

  return results;
}
