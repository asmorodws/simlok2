// Test script untuk menguji notifikasi real-time
const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

const prisma = new PrismaClient();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

async function testRealtimeNotification() {
  try {
    console.log('🧪 Testing real-time notifications...');

    // Simulasi notifikasi baru untuk reviewer
    const testNotification = {
      type: 'notification:new',
      data: {
        id: 'test-' + Date.now(),
        title: 'Test Notifikasi Real-time',
        message: 'Ini adalah test notifikasi untuk memastikan SSE bekerja dengan baik',
        type: 'SUBMISSION_REVIEW_NEEDED',
        scope: 'reviewer',
        vendorId: null,
        createdAt: new Date().toISOString(),
        isRead: false
      }
    };

    console.log('📤 Publishing test notification to Redis channel: notifications:reviewer');
    await redis.publish('notifications:reviewer', JSON.stringify(testNotification));

    console.log('✅ Test notification published!');
    console.log('💡 Cek browser untuk melihat apakah notifikasi muncul secara real-time');
    
    // Tunggu 2 detik lalu publish unread count update
    setTimeout(async () => {
      const unreadCountUpdate = {
        type: 'notification:unread_count', 
        data: {
          scope: 'reviewer',
          vendorId: null,
          unreadCount: 1
        }
      };
      
      console.log('📊 Publishing unread count update...');
      await redis.publish('notifications:reviewer', JSON.stringify(unreadCountUpdate));
      
      console.log('✅ Unread count update published!');
      process.exit(0);
    }, 2000);

  } catch (error) {
    console.error('❌ Error testing notification:', error);
    process.exit(1);
  }
}

testRealtimeNotification();