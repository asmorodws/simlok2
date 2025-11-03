/**
 * Next.js Instrumentation Hook
 * This file is automatically called by Next.js on server startup
 * Perfect place for graceful shutdown handlers
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import singletons to trigger graceful shutdown setup
    const { redisPub, redisSub } = await import('./lib/singletons');
    
    console.log('🚀 Server instrumentation registered');
    console.log('🛡️  Graceful shutdown handlers active');
    
    // Ensure connections are established (only if not already connected)
    try {
      if (redisPub.status === 'ready') {
        console.log('✅ Redis Pub already connected');
      } else if (redisPub.status === 'wait' || redisPub.status === 'end') {
        await redisPub.connect();
        console.log('✅ Redis Pub connected via instrumentation');
      }
      
      if (redisSub.status === 'ready') {
        console.log('✅ Redis Sub already connected');
      } else if (redisSub.status === 'wait' || redisSub.status === 'end') {
        await redisSub.connect();
        console.log('✅ Redis Sub connected via instrumentation');
      }
    } catch (error) {
      console.warn('⚠️  Redis connection warning:', error);
    }
  }
}
