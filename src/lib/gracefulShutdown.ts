/**
 * Graceful Shutdown Handler
 * Properly cleanup all resources when app is terminated
 */

import { prisma, redisPub, redisSub, getSocketIO } from './singletons';

let isShuttingDown = false;

export async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log('⏳ Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  console.log(`\n🛑 ${signal} signal received. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    console.error('❌ Graceful shutdown timeout! Forcing exit...');
    process.exit(1);
  }, 10000); // 10 seconds timeout

  try {
    // 1. Close Socket.IO connections
    const io = getSocketIO();
    if (io) {
      console.log('📡 Closing Socket.IO connections...');
      await new Promise<void>((resolve) => {
        io.close(() => {
          console.log('✅ Socket.IO closed');
          resolve();
        });
      });
    }

    // 2. Disconnect Redis clients
    console.log('🔴 Disconnecting Redis clients...');
    
    if (redisPub && redisPub.status !== 'end') {
      await redisPub.quit();
      console.log('✅ Redis Pub client disconnected');
    }
    
    if (redisSub && redisSub.status !== 'end') {
      await redisSub.quit();
      console.log('✅ Redis Sub client disconnected');
    }

    // 3. Disconnect Prisma
    console.log('🗄️  Disconnecting Prisma...');
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected');

    clearTimeout(shutdownTimeout);
    console.log('✨ Graceful shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers
 * Call this once when app starts
 */
export function setupGracefulShutdown() {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle SIGTERM (Docker/PM2 stop)
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });

  console.log('🛡️  Graceful shutdown handlers registered');
}
