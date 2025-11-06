/**
 * Singletons for Prisma, Redis, and Socket.IO Server
 * Safe for Hot Module Replacement in development
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

declare global {
  var __prisma: PrismaClient | undefined;
  var __redis_pub: Redis | undefined;
  var __redis_sub: Redis | undefined;
  var __socket_io: SocketIOServer | undefined;
  var __shutdown_setup: boolean | undefined;
}

/**
 * Prisma Singleton
 */
export const prisma = globalThis.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * Redis Clients Singleton
 */
function createRedisClient(prefix = ''): Redis {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts to allow graceful shutdown
      if (times > 3) {
        return null;
      }
      return Math.min(times * 100, 2000);
    },
    ...(prefix && { keyPrefix: `${prefix}:` }),
  });

  client.on('error', (err) => {
    console.warn(`Redis client error (${prefix || 'default'}):`, err.message);
  });

  client.on('connect', () => {
    console.log(`Redis client connected (${prefix || 'default'})`);
  });

  // Handle connection close
  client.on('close', () => {
    console.log(`Redis client closed (${prefix || 'default'})`);
  });

  return client;
}

export const redisPub = globalThis.__redis_pub ?? createRedisClient('pub');
export const redisSub = globalThis.__redis_sub ?? createRedisClient('sub');

if (process.env.NODE_ENV !== 'production') {
  globalThis.__redis_pub = redisPub;
  globalThis.__redis_sub = redisSub;
}

/**
 * Setup graceful shutdown handlers immediately on module load
 * This ensures cleanup happens even without custom server
 */
if (!globalThis.__shutdown_setup) {
  setupGracefulShutdownHandlers();
  globalThis.__shutdown_setup = true;
}

/**
 * Socket.IO Server Singleton
 * Will be initialized when HTTP server is available
 */
export function getSocketIO(): SocketIOServer | null {
  return globalThis.__socket_io || null;
}

export function setSocketIO(io: SocketIOServer): void {
  globalThis.__socket_io = io;
}

/**
 * Initialize Socket.IO with Redis adapter
 */
export function initializeSocketIO(httpServer: any): SocketIOServer {
  if (globalThis.__socket_io) {
    return globalThis.__socket_io;
  }

  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Setup Redis adapter
  try {
    io.adapter(createAdapter(redisPub, redisSub));
    console.log('Socket.IO Redis adapter initialized');
  } catch (error) {
    console.warn('Socket.IO Redis adapter failed, using memory adapter:', error);
  }

  setSocketIO(io);
  
  return io;
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdownHandlers() {
  let isShuttingDown = false;
  let shutdownHandlersRegistered = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      return; // Silent return if already shutting down
    }

    isShuttingDown = true;
    console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      console.error('❌ Graceful shutdown timeout! Forcing exit...');
      process.exit(1);
    }, 5000); // Reduced to 5 seconds for faster shutdown

    try {
      // 1. Close Socket.IO
      const io = getSocketIO();
      if (io && typeof io.close === 'function') {
        console.log('📡 Closing Socket.IO...');
        try {
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn('⚠️  Socket.IO close timeout, continuing shutdown...');
              resolve();
            }, 2000);

            io.close((err?: Error) => {
              clearTimeout(timeout);
              if (err) {
                console.warn('⚠️  Socket.IO close error:', err.message);
              } else {
                console.log('✅ Socket.IO closed');
              }
              resolve();
            });
          });
        } catch (error: any) {
          console.warn('⚠️  Socket.IO close failed:', error?.message || error);
        }
      } else if (io) {
        console.log('⚠️  Socket.IO exists but close method not available');
      } else {
        console.log('ℹ️  Socket.IO not initialized, skipping close');
      }

      // 2. Disconnect Redis clients
      console.log('🔴 Disconnecting Redis...');
      const redisClosePromises = [];
      
      if (redisPub && redisPub.status !== 'end' && redisPub.status !== 'close') {
        redisClosePromises.push(
          redisPub.quit()
            .then(() => console.log('✅ Redis Pub disconnected'))
            .catch((err: Error) => {
              console.warn('⚠️  Redis Pub disconnect error:', err.message);
            })
        );
      } else {
        console.log('ℹ️  Redis Pub already closed or not connected');
      }
      
      if (redisSub && redisSub.status !== 'end' && redisSub.status !== 'close') {
        redisClosePromises.push(
          redisSub.quit()
            .then(() => console.log('✅ Redis Sub disconnected'))
            .catch((err: Error) => {
              console.warn('⚠️  Redis Sub disconnect error:', err.message);
            })
        );
      } else {
        console.log('ℹ️  Redis Sub already closed or not connected');
      }

      await Promise.allSettled(redisClosePromises); // Use allSettled to continue even if one fails

      // 3. Disconnect Prisma
      console.log('🗄️  Disconnecting Prisma...');
      try {
        await prisma.$disconnect();
        console.log('✅ Prisma disconnected');
      } catch (error: any) {
        console.warn('⚠️  Prisma disconnect error:', error?.message || error);
      }

      clearTimeout(shutdownTimeout);
      console.log('✨ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Shutdown error:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  // Register signal handlers (only once)
  if (!shutdownHandlersRegistered) {
    process.once('SIGINT', () => gracefulShutdown('SIGINT'));
    process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      // Only log if not during shutdown
      if (!isShuttingDown) {
        console.error('❌ Unhandled Rejection at:', promise);
        console.error('❌ Reason:', reason);
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      // Only log if not during shutdown
      if (!isShuttingDown) {
        console.error('❌ Uncaught Exception:', error);
      }
    });
    
    shutdownHandlersRegistered = true;
    console.log('🛡️  Graceful shutdown handlers registered');
  }
}

