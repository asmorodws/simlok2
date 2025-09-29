// Test Redis connection dan publish/subscribe
const Redis = require('ioredis');

async function testRedisConnection() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
  });

  try {
    console.log('🔄 Testing Redis connection...');
    const pong = await redis.ping();
    console.log('✅ Redis ping response:', pong);

    // Test publish to notifications:reviewer channel
    console.log('📤 Publishing test message to notifications:reviewer...');
    
    const testMessage = {
      type: 'notification:new',
      data: {
        id: 'redis-test-' + Date.now(),
        title: '🚀 Redis Connection Test',
        message: 'Test message untuk memastikan Redis pub/sub bekerja',
        type: 'TEST_NOTIFICATION',
        scope: 'reviewer',
        isRead: false,
        createdAt: new Date().toISOString()
      }
    };

    const result = await redis.publish('notifications:reviewer', JSON.stringify(testMessage));
    console.log('📡 Published to notifications:reviewer, subscribers:', result);

    // Test subscribe
    const subscriber = redis.duplicate();
    console.log('👂 Testing subscription...');
    
    await subscriber.subscribe('notifications:reviewer');
    console.log('✅ Subscribed to notifications:reviewer');

    subscriber.on('message', (channel, message) => {
      console.log(`📨 Received on ${channel}:`, JSON.parse(message).data.title);
    });

    // Publish another message to test subscription
    setTimeout(async () => {
      const testMessage2 = {
        type: 'notification:new',
        data: {
          id: 'redis-test-2-' + Date.now(),
          title: '📬 Subscription Test',
          message: 'Message ke-2 untuk test subscription',
          type: 'TEST_NOTIFICATION',
          scope: 'reviewer',
          isRead: false,
          createdAt: new Date().toISOString()
        }
      };
      
      await redis.publish('notifications:reviewer', JSON.stringify(testMessage2));
      console.log('📤 Published second test message');
      
      // Cleanup
      setTimeout(() => {
        subscriber.disconnect();
        redis.disconnect();
        console.log('🔌 Disconnected from Redis');
      }, 1000);
    }, 1000);

  } catch (error) {
    console.error('❌ Redis test failed:', error);
    redis.disconnect();
  }
}

testRedisConnection();