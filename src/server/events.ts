import { prisma } from '@/lib/singletons';
import { eventsPublisher } from './eventsPublisher';
import { notificationsPublisher } from './notificationsPublisher';
import type {
  AdminNewSubmissionEvent,
  AdminNewVendorEvent,
  VendorSubmissionStatusChangedEvent,
  NotificationNewEvent
} from '../shared/events';// Helper to count unread notifications
async function getUnreadCount(scope: 'admin' | 'vendor' | 'reviewer' | 'approver', vendorId?: string): Promise<number> {
  if (scope === 'admin') {
    return await prisma.notification.count({
      where: {
        scope: 'admin',
        reads: {
          none: {}
        }
      }
    });
  } else if (scope === 'reviewer') {
    return await prisma.notification.count({
      where: {
        scope: 'reviewer',
        reads: {
          none: {}
        }
      }
    });
  } else if (scope === 'approver') {
    return await prisma.notification.count({
      where: {
        scope: 'approver',
        reads: {
          none: {}
        }
      }
    });
  } else if (scope === 'vendor' && vendorId) {
    return await prisma.notification.count({
      where: {
        scope: 'vendor',
        vendor_id: vendorId,
        reads: {
          none: {
            vendor_id: vendorId
          }
        }
      }
    });
  }
  
  return 0;
}

export async function notifyAdminNewSubmission(submissionId: string) {
  try {
    // Get submission details
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { user: true }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        scope: 'admin',
        type: 'new_submission',
        title: 'Pengajuan Simlok Baru',
        message: `Pengajuan baru dari ${submission.vendor_name} - ${submission.officer_name}`,
        data: JSON.stringify({
          submissionId,
          vendorName: submission.vendor_name,
          officerName: submission.officer_name
        })
      }
    });

    // Emit events
    const submissionEvent: AdminNewSubmissionEvent = {
      submissionId,
      createdAt: submission.created_at.toISOString()
    };

    const notificationEvent: NotificationNewEvent = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      scope: 'admin',
      createdAt: notification.created_at.toISOString()
    };

    eventsPublisher.adminNewSubmission(submissionEvent);
    eventsPublisher.notificationNew(notificationEvent);
    
    // Publish to real-time subscribers via Redis
    await notificationsPublisher.publishNotification(notificationEvent);

    // Update unread count
    const unreadCount = await getUnreadCount('admin');
    const unreadCountEvent = {
      scope: 'admin' as const,
      unreadCount: unreadCount,
      count: unreadCount
    };
    eventsPublisher.notificationUnreadCount(unreadCountEvent);
    await notificationsPublisher.publishUnreadCount(unreadCountEvent);

    // Update stats
    const totalPending = await prisma.submission.count({
      where: { approval_status: 'PENDING' }
    });

    eventsPublisher.statsUpdate({
      scope: 'admin',
      changes: {
        pendingSubmissions: totalPending,
        totalSubmissions: await prisma.submission.count()
      }
    });

    // Also notify reviewers about new submission
    await notifyReviewerNewSubmission(submissionId);

  } catch (error) {
    console.error('Error notifying admin new submission:', error);
  }
}

export async function notifyAdminNewVendor(vendorId: string) {
  try {
    // Get vendor details
    const vendor = await prisma.user.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        scope: 'admin',
        type: 'new_vendor',
        title: 'Pendaftaran Vendor Baru',
        message: `Vendor baru mendaftar: ${vendor.vendor_name || vendor.officer_name}`,
        data: JSON.stringify({
          vendorId,
          vendorName: vendor.vendor_name,
          officerName: vendor.officer_name,
          email: vendor.email
        })
      }
    });

    // Emit events
    const vendorEvent: AdminNewVendorEvent = {
      vendorId,
      createdAt: vendor.created_at.toISOString()
    };

    const notificationEvent: NotificationNewEvent = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      scope: 'admin',
      createdAt: notification.created_at.toISOString()
    };

    eventsPublisher.adminNewVendor(vendorEvent);
    eventsPublisher.notificationNew(notificationEvent);
    
    // Publish to real-time subscribers via Redis
    await notificationsPublisher.publishNotification(notificationEvent);

    // Update unread count
    const unreadCount = await getUnreadCount('admin');
    const unreadCountEvent = {
      scope: 'admin' as const,
      unreadCount: unreadCount,
      count: unreadCount
    };
    eventsPublisher.notificationUnreadCount(unreadCountEvent);
    await notificationsPublisher.publishUnreadCount(unreadCountEvent);

    // Update stats
    const totalVendors = await prisma.user.count({
      where: { role: 'VENDOR' }
    });

    eventsPublisher.statsUpdate({
      scope: 'admin',
      changes: {
        totalVendors
      }
    });

  } catch (error) {
    console.error('Error notifying admin new vendor:', error);
  }
}

export async function notifyVendorStatusChange(
  vendorId: string, 
  submissionId: string, 
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
) {
  try {
    // Get submission details
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    const statusText = {
      PENDING: 'Menunggu Persetujuan',
      APPROVED: 'Disetujui',
      REJECTED: 'Ditolak'
    }[status];

    // Truncate job description if too long
    // const truncateText = (text: string, maxLength: number = 50) => {
    //   return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
    // };

    // const truncatedJobDescription = truncateText(submission.job_description);

    // Create more informative title and message with submission ID
    const title = status === 'APPROVED' 
      ? `Pengajuan Disetujui` 
      : status === 'REJECTED' 
        ? `Pengajuan Ditolak`
        : `Pengajuan ${statusText}`;

    const message = status === 'APPROVED'
      ? `Selamat! Pengajuan Simlok Anda telah disetujui.`
      : status === 'REJECTED'
        ? `Pengajuan Simlok Anda ditolak. Silakan periksa keterangan pada pengajuan.`
        : `Status pengajuan Simlok Anda berubah menjadi ${statusText.toLowerCase()}.`;

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        scope: 'vendor',
        vendor_id: vendorId,
        type: 'status_change',
        title: title,
        message: message,
        data: JSON.stringify({
          submissionId,
          status,
          jobDescription: submission.job_description
        })
      }
    });

    // Emit events
    const statusEvent: VendorSubmissionStatusChangedEvent = {
      submissionId,
      status,
      updatedAt: new Date().toISOString()
    };

    const notificationEvent: NotificationNewEvent = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      scope: 'vendor',
      vendorId,
      createdAt: notification.created_at.toISOString()
    };

  eventsPublisher.vendorSubmissionStatusChanged(vendorId, statusEvent);
  eventsPublisher.notificationNew(notificationEvent);
  
  // Publish to real-time subscribers via Redis
  await notificationsPublisher.publishNotification(notificationEvent);

  // Update unread count
  const unreadCount = await getUnreadCount('vendor', vendorId);
  const unreadCountEvent = {
    scope: 'vendor' as const,
    vendorId,
    unreadCount: unreadCount,
    count: unreadCount
  };
  eventsPublisher.notificationUnreadCount(unreadCountEvent);
  await notificationsPublisher.publishUnreadCount(unreadCountEvent);    // Update vendor stats
    const vendorSubmissions = await prisma.submission.findMany({
      where: { user_id: vendorId }
    });

    const stats = {
      totalSubmissions: vendorSubmissions.length,
      pendingSubmissions: vendorSubmissions.filter((s: any) => s.approval_status === 'PENDING').length,
      approvedSubmissions: vendorSubmissions.filter((s: any) => s.approval_status === 'APPROVED').length,
      rejectedSubmissions: vendorSubmissions.filter((s: any) => s.approval_status === 'REJECTED').length
    };

    eventsPublisher.statsUpdate({
      scope: 'vendor',
      vendorId,
      changes: stats
    });

  } catch (error) {
    console.error('Error notifying vendor status change:', error);
  }
}

export async function notifyNotificationsRemoved(submissionId: string) {
  try {
    console.log(`Broadcasting notification removal for submission: ${submissionId}`);

    // Create event for notification removal
    const notificationRemovalEvent = {
      submissionId,
      timestamp: new Date().toISOString()
    };

    // Emit to Socket.io clients
    eventsPublisher.notificationRemoved(notificationRemovalEvent);
    
    // Publish to real-time subscribers via Redis
    await notificationsPublisher.publishNotificationRemoval(notificationRemovalEvent);

    console.log(`✅ Broadcasted notification removal for submission: ${submissionId}`);

  } catch (error) {
    console.error('Error broadcasting notification removal:', error);
  }
}

export async function notifyReviewerNewSubmission(submissionId: string) {
  try {
    // Get submission details
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { user: true }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Create notification record for reviewers
    const notification = await prisma.notification.create({
      data: {
        scope: 'reviewer',
        type: 'new_submission_review',
        title: 'Pengajuan Simlok Baru untuk Review',
        message: `Ada pengajuan baru dari ${submission.vendor_name} - ${submission.officer_name} yang perlu direview`,
        data: JSON.stringify({
          submissionId,
          vendorName: submission.vendor_name,
          officerName: submission.officer_name,
          jobDescription: submission.job_description
        })
      }
    });

    // Create notification event
    const notificationEvent: NotificationNewEvent = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      scope: 'reviewer',
      createdAt: notification.created_at.toISOString()
    };

    eventsPublisher.notificationNew(notificationEvent);
    
    // Publish to real-time subscribers via Redis
    await notificationsPublisher.publishNotification(notificationEvent);

    // Update unread count for reviewers
    const unreadCount = await getUnreadCount('reviewer');
    const unreadCountEvent = {
      scope: 'reviewer' as const,
      unreadCount: unreadCount,
      count: unreadCount
    };
    eventsPublisher.notificationUnreadCount(unreadCountEvent);
    await notificationsPublisher.publishUnreadCount(unreadCountEvent);

    // Update reviewer stats
    const totalPendingReview = await prisma.submission.count({
      where: { review_status: 'PENDING_REVIEW' }
    });

    eventsPublisher.statsUpdate({
      scope: 'reviewer',
      changes: {
        pendingReview: totalPendingReview,
        totalSubmissions: await prisma.submission.count()
      }
    });

    console.log(`✅ Notified reviewers about new submission: ${submissionId}`);

  } catch (error) {
    console.error('Error notifying reviewer new submission:', error);
  }
}

export async function notifyApproverReviewedSubmission(submissionId: string) {
  try {
    // Get submission details
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { 
        user: true,
        reviewed_by_user: {
          select: {
            officer_name: true
          }
        }
      }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Only notify approvers if the submission was approved by reviewer
    if (submission.review_status !== 'MEETS_REQUIREMENTS') {
      console.log(`Submission ${submissionId} not approved by reviewer (status: ${submission.review_status}), skipping approver notification`);
      return;
    }

    // Create notification record for approvers
    const notification = await prisma.notification.create({
      data: {
        scope: 'approver',
        type: 'reviewed_submission_approval',
        title: 'Pengajuan Simlok Sudah Direview',
        message: `Pengajuan dari ${submission.vendor_name} - ${submission.officer_name} sudah direview dan perlu persetujuan final`,
        data: JSON.stringify({
          submissionId,
          vendorName: submission.vendor_name,
          officerName: submission.officer_name,
          jobDescription: submission.job_description,
          reviewedBy: submission.reviewed_by_user?.officer_name,
          reviewStatus: submission.review_status,
          reviewNote: submission.review_note
        })
      }
    });

    // Create notification event
    const notificationEvent: NotificationNewEvent = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      scope: 'approver',
      createdAt: notification.created_at.toISOString()
    };

    eventsPublisher.notificationNew(notificationEvent);
    
    // Publish to real-time subscribers via Redis
    await notificationsPublisher.publishNotification(notificationEvent);

    // Update unread count for approvers
    const unreadCount = await getUnreadCount('approver');
    const unreadCountEvent = {
      scope: 'approver' as const,
      unreadCount: unreadCount,
      count: unreadCount
    };
    eventsPublisher.notificationUnreadCount(unreadCountEvent);
    await notificationsPublisher.publishUnreadCount(unreadCountEvent);

    // Update approver stats
    const totalPendingFinal = await prisma.submission.count({
      where: { 
        review_status: 'MEETS_REQUIREMENTS',
        final_status: 'PENDING_APPROVAL'
      }
    });

    eventsPublisher.statsUpdate({
      scope: 'approver',
      changes: {
        pendingFinalApproval: totalPendingFinal,
        totalReviewedSubmissions: await prisma.submission.count({
          where: { review_status: { not: 'PENDING_REVIEW' } }
        })
      }
    });

    console.log(`✅ Notified approvers about reviewed submission: ${submissionId}`);

  } catch (error) {
    console.error('Error notifying approver reviewed submission:', error);
  }
}
