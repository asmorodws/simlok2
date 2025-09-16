const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupOrphanedNotifications() {
  try {
    console.log('🧹 Starting cleanup of orphaned notifications...');
    
    // Find all notifications that reference submissions
    const submissionNotifications = await prisma.notification.findMany({
      where: {
        OR: [
          { data: { contains: 'submissionId' } },
          { data: { contains: 'submission_id' } },
          { message: { contains: 'ID' } },
          { title: { contains: 'ID' } }
        ]
      }
    });
    
    console.log(`Found ${submissionNotifications.length} notifications that might reference submissions`);
    
    const orphanedNotifications = [];
    
    // Check each notification
    for (const notif of submissionNotifications) {
      let submissionId = null;
      
      // Extract submission ID from data field
      if (notif.data) {
        try {
          const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;
          submissionId = data.submissionId || data.submission_id;
        } catch (e) {
          // ignore parsing errors
        }
      }
      
      // Extract from message/title if not found in data
      if (!submissionId) {
        const idPattern = /ID[:\s]+([a-zA-Z0-9]+)/i;
        const messageMatch = notif.message.match(idPattern);
        const titleMatch = notif.title.match(idPattern);
        submissionId = messageMatch?.[1] || titleMatch?.[1];
      }
      
      if (submissionId) {
        // Check if submission exists
        const submission = await prisma.submission.findUnique({
          where: { id: submissionId }
        });
        
        if (!submission) {
          orphanedNotifications.push({
            notification: notif,
            submissionId: submissionId
          });
        }
      }
    }
    
    console.log(`\nFound ${orphanedNotifications.length} orphaned notifications:`);
    
    if (orphanedNotifications.length > 0) {
      console.log('\n📋 Orphaned notifications:');
      orphanedNotifications.forEach((item, index) => {
        console.log(`${index + 1}. ${item.notification.type} - ${item.notification.title}`);
        console.log(`   Missing submission ID: ${item.submissionId}`);
        console.log(`   Created: ${item.notification.created_at}`);
      });
      
      console.log('\n❓ Cleaning up orphaned notifications automatically...');
      
      // Delete orphaned notifications
      console.log('\n🗑️ Deleting orphaned notifications...');
      
      for (const item of orphanedNotifications) {
        // First delete NotificationRead records
        await prisma.notificationRead.deleteMany({
          where: { notification_id: item.notification.id }
        });
        
        // Then delete the notification
        await prisma.notification.delete({
          where: { id: item.notification.id }
        });
        
        console.log(`✅ Deleted notification ${item.notification.id} (${item.notification.type})`);
      }
      
      console.log(`\n✅ Successfully cleaned up ${orphanedNotifications.length} orphaned notifications`);
    } else {
      console.log('✅ No orphaned notifications found!');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphanedNotifications();
