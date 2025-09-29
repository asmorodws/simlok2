// Test script untuk notifikasi realtime ke reviewer ketika submission di-approve
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
});

async function testReviewerApprovalNotification() {
  try {
    console.log('🧪 Testing reviewer notification for approved submission...');

    // Simulasi notifikasi ke reviewer ketika submission di-approve
    const approvalNotification = {
      type: 'notification:new',
      data: {
        id: 'approval-test-' + Date.now(),
        title: '✅ Pengajuan Simlok Disetujui',
        message: 'Pengajuan dari PT Test Vendor - John Doe telah disetujui oleh Approver',
        type: 'submission_approved',
        scope: 'reviewer',
        isRead: false,
        createdAt: new Date().toISOString(),
        data: JSON.stringify({
          submissionId: 'test-submission-123',
          vendorName: 'PT Test Vendor',
          officerName: 'John Doe',
          jobDescription: 'Pekerjaan Test di Area Produksi',
          approvedBy: 'Manager Approval',
          finalStatus: 'APPROVED',
          simlokNumber: 'SIMLOK/TEST/2025/001',
          approvedAt: new Date().toISOString()
        })
      }
    };

    console.log('📤 Publishing approval notification to Redis channel: notifications:reviewer');
    const subscribers = await redis.publish('notifications:reviewer', JSON.stringify(approvalNotification));
    console.log(`✅ Published to ${subscribers} active reviewer subscribers`);
    
    // Send unread count update
    setTimeout(async () => {
      const unreadUpdate = {
        type: 'notification:unread_count',
        data: {
          scope: 'reviewer',
          unreadCount: 1,
          count: 1
        }
      };
      
      console.log('📤 Publishing unread count update...');
      await redis.publish('notifications:reviewer', JSON.stringify(unreadUpdate));
      console.log('✅ Unread count update sent!');
      
      redis.disconnect();
    }, 1000);
    
    console.log('💡 Cek browser dengan role reviewer untuk melihat notifikasi approval secara real-time');
    
  } catch (error) {
    console.error('❌ Error testing reviewer notification:', error);
    redis.disconnect();
  }
}

testReviewerApprovalNotification();