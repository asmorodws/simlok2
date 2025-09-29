// Final test untuk notifikasi real-time dengan SSE connection aktif
const Redis = require('ioredis');

async function sendRealTimeNotification() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
  });

  try {
    console.log('🚀 Sending real-time notification test...');
    
    const testNotification = {
      type: 'notification:new',
      data: {
        id: 'realtime-test-' + Date.now(),
        title: '🔔 Notifikasi Real-time Aktif!',
        message: 'Sistem Server-Sent Events (SSE) berfungsi dengan sempurna menggantikan Socket.IO',
        type: 'SYSTEM_TEST',
        scope: 'reviewer',
        isRead: false,
        createdAt: new Date().toISOString(),
        submissionId: 'test-' + Date.now()
      }
    };

    // Check berapa subscriber yang akan menerima
    const subscribers = await redis.publish('notifications:reviewer', JSON.stringify(testNotification));
    console.log(`✅ Published notification to ${subscribers} active SSE subscribers`);
    
    // Send unread count update
    setTimeout(async () => {
      const unreadUpdate = {
        type: 'notification:unread_count',
        data: {
          scope: 'reviewer',
          vendorId: null,
          unreadCount: 1
        }
      };
      
      const countSubscribers = await redis.publish('notifications:reviewer', JSON.stringify(unreadUpdate));
      console.log(`📊 Updated unread count for ${countSubscribers} subscribers`);
      
      console.log('🎉 Real-time notifications test completed!');
      console.log('💡 Cek browser untuk melihat notifikasi muncul secara real-time');
      
      redis.disconnect();
    }, 1000);

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    redis.disconnect();
  }
}

sendRealTimeNotification();