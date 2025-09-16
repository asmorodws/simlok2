/**
 * Utility script to clean up orphaned notifications
 * These are notifications that reference submissions that no longer exist
 */

import { prisma } from '@/lib/singletons';

export async function cleanupOrphanedNotifications() {
  console.log('Starting cleanup of orphaned notifications...');
  
  try {
    // Get all notifications that have data field
    const notificationsWithData = await prisma.notification.findMany({
      where: {
        data: {
          not: null
        }
      }
    });

    console.log(`Found ${notificationsWithData.length} notifications with data to check`);

    const orphanedNotifications = [];

    // Check each notification to see if it references a valid submission
    for (const notification of notificationsWithData) {
      if (!notification.data) continue;

      try {
        const data = JSON.parse(notification.data);
        
        // Check if notification contains submissionId
        if (data.submissionId) {
          // Verify that the submission still exists
          const submissionExists = await prisma.submission.findUnique({
            where: { id: data.submissionId },
            select: { id: true }
          });

          if (!submissionExists) {
            orphanedNotifications.push({
              id: notification.id,
              submissionId: data.submissionId,
              type: notification.type,
              title: notification.title,
              createdAt: notification.created_at
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to parse notification data for notification ${notification.id}:`, error);
      }
    }

    console.log(`Found ${orphanedNotifications.length} orphaned notifications`);

    if (orphanedNotifications.length > 0) {
      console.log('Orphaned notifications:');
      orphanedNotifications.forEach(notif => {
        console.log(`- ${notif.id}: ${notif.title} (submission: ${notif.submissionId})`);
      });

      // Delete NotificationRead records first
      const notificationIds = orphanedNotifications.map(n => n.id);
      
      const deletedReads = await prisma.notificationRead.deleteMany({
        where: {
          notification_id: {
            in: notificationIds
          }
        }
      });

      console.log(`Deleted ${deletedReads.count} notification read records`);

      // Delete the orphaned notifications
      const deletedNotifications = await prisma.notification.deleteMany({
        where: {
          id: {
            in: notificationIds
          }
        }
      });

      console.log(`Deleted ${deletedNotifications.count} orphaned notifications`);
    } else {
      console.log('No orphaned notifications found');
    }

    return {
      checked: notificationsWithData.length,
      orphaned: orphanedNotifications.length,
      cleaned: orphanedNotifications.length
    };

  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

// If this script is run directly (e.g., node cleanup-orphaned-notifications.js)
if (require.main === module) {
  cleanupOrphanedNotifications()
    .then((result) => {
      console.log('Cleanup completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}
