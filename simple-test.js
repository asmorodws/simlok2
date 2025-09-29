// Test sederhana untuk cek Redis message pada SSE connection
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

async function testRedisMessage() {
  console.log('📨 Sending test message to Redis channel: notifications:reviewer');
  
  const message = {
    type: 'notification:new',
    data: {
      id: 'test-realtime-' + Date.now(),
      title: '🔥 Test Real-time Notification',
      message: 'Jika Anda melihat ini di browser, SSE bekerja dengan sempurna!',
      type: 'TEST_NOTIFICATION',
      scope: 'reviewer',
      isRead: false,
      createdAt: new Date().toISOString()
    }
  };

  await redis.publish('notifications:reviewer', JSON.stringify(message));
  console.log('✅ Message sent! Check the browser for real-time notification.');
  
  redis.disconnect();
}

testRedisMessage().catch(console.error);