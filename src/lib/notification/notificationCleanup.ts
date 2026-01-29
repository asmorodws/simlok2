import { PrismaClient } from '@prisma/client';
import { notifyNotificationsRemoved } from '@/lib/notification/events';

const prisma = new PrismaClient();

/**
 * Clean up notifications that reference deleted submissions
 * This function is used to maintain data integrity
 */
export async function cleanupOrphanedNotifications() {
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
    
    if (orphanedNotifications.length > 0) {
      console.log(`Found ${orphanedNotifications.length} orphaned notifications to clean up`);
      
      // Delete orphaned notifications
      for (const item of orphanedNotifications) {
        // First delete NotificationRead records
        await prisma.notificationRead.deleteMany({
          where: { notification_id: item.notification.id }
        });
        
        // Then delete the notification
        await prisma.notification.delete({
          where: { id: item.notification.id }
        });
        
        console.log(`✅ Deleted orphaned notification ${item.notification.id} (${item.notification.type})`);
      }
      
      console.log(`✅ Successfully cleaned up ${orphanedNotifications.length} orphaned notifications`);
      return orphanedNotifications.length;
    } else {
      console.log('✅ No orphaned notifications found');
      return 0;
    }
    
  } catch (error) {
    console.error('❌ Error during notification cleanup:', error);
    throw error;
  }
}

/**
 * Clean up notifications specifically for a deleted submission
 * This is called when a submission is deleted
 */
export async function cleanupSubmissionNotifications(submissionId: string) {
  try {
    console.log(`🧹 Cleaning up notifications for deleted submission: ${submissionId}`);
    
    // Find notifications that reference this specific submission
    const notificationsToDelete = await prisma.notification.findMany({
      where: {
        OR: [
          { data: { contains: submissionId } },
          { message: { contains: submissionId } },
          { title: { contains: submissionId } }
        ]
      }
    });
    
    console.log(`Found ${notificationsToDelete.length} notifications to delete for submission ${submissionId}`);
    
    // Delete NotificationRead records first (due to foreign key constraints)
    for (const notification of notificationsToDelete) {
      await prisma.notificationRead.deleteMany({
        where: { notification_id: notification.id }
      });
    }
    
    // Delete the notifications
    const deleteResult = await prisma.notification.deleteMany({
      where: {
        OR: [
          { data: { contains: submissionId } },
          { message: { contains: submissionId } },
          { title: { contains: submissionId } }
        ]
      }
    });
    
    console.log(`✅ Deleted ${deleteResult.count} notifications for submission ${submissionId}`);
    
    // Broadcast notification removal to all clients
    await notifyNotificationsRemoved(submissionId);
    
    return deleteResult.count;
    
  } catch (error) {
    console.error(`❌ Error cleaning notifications for submission ${submissionId}:`, error);
    throw error;
  }
}
