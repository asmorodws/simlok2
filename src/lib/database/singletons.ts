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
      if (io) {
        console.log('📡 Closing Socket.IO...');
        await new Promise<void>((resolve) => {
          io.close(() => {
            console.log('✅ Socket.IO closed');
            resolve();
          });
        });
      }

      // 2. Disconnect Redis clients
      console.log('🔴 Disconnecting Redis...');
      const redisClosePromises = [];
      
      if (redisPub && redisPub.status !== 'end' && redisPub.status !== 'close') {
        redisClosePromises.push(
          redisPub.quit().then(() => console.log('✅ Redis Pub disconnected'))
        );
      }
      
      if (redisSub && redisSub.status !== 'end' && redisSub.status !== 'close') {
        redisClosePromises.push(
          redisSub.quit().then(() => console.log('✅ Redis Sub disconnected'))
        );
      }

      await Promise.all(redisClosePromises);

      // 3. Disconnect Prisma
      console.log('🗄️  Disconnecting Prisma...');
      await prisma.$disconnect();
      console.log('✅ Prisma disconnected');

      clearTimeout(shutdownTimeout);
      console.log('✨ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Shutdown error:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  console.log('🛡️  Graceful shutdown handlers registered');
}

