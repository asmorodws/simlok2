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
    ...(prefix && { keyPrefix: `${prefix}:` }),
  });

  client.on('error', (err) => {
    console.warn(`Redis client error (${prefix || 'default'}):`, err.message);
  });

  client.on('connect', () => {
    console.log(`Redis client connected (${prefix || 'default'})`);
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
