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
      where: { approval_status: 'PENDING_APPROVAL' }
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

    // Emit submission created event to reviewers
    eventsPublisher.submissionCreated({
      submissionId,
      vendorName: submission.vendor_name,
      officerName: submission.officer_name,
      createdAt: submission.created_at.toISOString()
    });

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
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
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
      PENDING_APPROVAL: 'Menunggu Persetujuan',
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
  
  // Emit specific submission finalized event
  eventsPublisher.submissionFinalized(vendorId, {
    submissionId,
    finalStatus: status,
    finalizedBy: 'Approver', // You might want to pass actual approver name
    finalizedAt: new Date().toISOString()
  });
  
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
      pendingSubmissions: vendorSubmissions.filter((s: any) => s.approval_status === 'PENDING_APPROVAL').length,
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

export async function notifyReviewerNewUser(userId: string) {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create notification record for reviewers
    const notification = await prisma.notification.create({
      data: {
        scope: 'reviewer',
        type: 'new_user_verification',
        title: 'User Baru Perlu Verifikasi',
        message: `User baru ${user.vendor_name || user.officer_name} perlu diverifikasi`,
        data: JSON.stringify({
          userId,
          vendorName: user.vendor_name,
          officerName: user.officer_name,
          email: user.email,
          phoneNumber: user.phone_number,
          registrationDate: user.created_at.toISOString()
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

    // Emit specific user verification event
    eventsPublisher.userVerificationNeeded({
      userId,
      vendorName: user.vendor_name || '',
      officerName: user.officer_name,
      email: user.email,
      createdAt: user.created_at.toISOString()
    });

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
    const totalPendingUsers = await prisma.user.count({
      where: { 
        verified_at: null,
        role: 'VENDOR' // Only vendor users need verification
      }
    });

    eventsPublisher.statsUpdate({
      scope: 'reviewer',
      changes: {
        pendingUserVerifications: totalPendingUsers
      }
    });

    console.log(`✅ Notified reviewers about new user: ${userId}`);

  } catch (error) {
    console.error('Error notifying reviewer new user:', error);
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

    // Determine notification message and type based on review status
    let notificationMessage: string;
    let notificationType: string;
    let notificationTitle: string;
    
    if (submission.review_status === 'MEETS_REQUIREMENTS') {
      notificationMessage = `Pengajuan dari ${submission.vendor_name} - ${submission.officer_name} sudah direview dan perlu persetujuan final`;
      notificationType = 'reviewed_submission_approval';
      notificationTitle = 'Pengajuan Simlok Perlu Persetujuan';
    } else {
      notificationMessage = `Pengajuan dari ${submission.vendor_name} - ${submission.officer_name} sudah direview dan tidak memenuhi syarat`;
      notificationType = 'reviewed_submission_rejection';
      notificationTitle = 'Pengajuan Simlok Sudah Direview';
    }

    // Create notification record for approvers (for both meets and doesn't meet requirements)
    const notification = await prisma.notification.create({
      data: {
        scope: 'approver',
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        data: JSON.stringify({
          submissionId,
          vendorName: submission.vendor_name,
          officerName: submission.officer_name,
          jobDescription: submission.job_description,
          reviewedBy: submission.reviewed_by_user?.officer_name,
          reviewStatus: submission.review_status,
          reviewNote: submission.note_for_approver
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

    // Emit specific submission reviewed event
    eventsPublisher.submissionReviewed({
      submissionId,
      reviewStatus: submission.review_status,
      reviewedBy: submission.reviewed_by_user?.officer_name || 'Unknown',
      reviewedAt: new Date().toISOString()
    });

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
        approval_status: 'PENDING_APPROVAL'
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

export async function notifyUserVerificationResult(
  userId: string, 
  verificationStatus: 'VERIFY' | 'REJECT',
  note?: string
) {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const title = verificationStatus === 'VERIFY' 
      ? 'Akun Anda Telah Diverifikasi' 
      : 'Verifikasi Akun Ditolak';
      
    const message = verificationStatus === 'VERIFY'
      ? 'Selamat! Akun vendor Anda telah diverifikasi dan sekarang dapat mengajukan permohonan Simlok.'
      : `Maaf, akun vendor Anda tidak dapat diverifikasi. ${note || 'Silakan hubungi admin untuk informasi lebih lanjut.'}`;

    // Create notification event
    const notificationEvent: NotificationNewEvent = {
      id: `temp_${Date.now()}`, // Will be replaced when notification is created
      type: verificationStatus === 'VERIFY' ? 'user_verified' : 'user_rejected',
      title: title,
      message: message,
      data: JSON.stringify({
        userId,
        verificationStatus,
        note
      }),
      scope: 'vendor',
      vendorId: userId,
      createdAt: new Date().toISOString()
    };

    eventsPublisher.notificationNew(notificationEvent);
    
    // Publish to real-time subscribers via Redis
    await notificationsPublisher.publishNotification(notificationEvent);

    // Emit specific user verification result event
    eventsPublisher.userVerificationResult(userId, {
      userId,
      status: verificationStatus,
      verifiedAt: new Date().toISOString(),
      note: note || ''
    });

    // Update unread count for the specific vendor
    const unreadCount = await getUnreadCount('vendor', userId);
    const unreadCountEvent = {
      scope: 'vendor' as const,
      vendorId: userId,
      unreadCount: unreadCount,
      count: unreadCount
    };
    eventsPublisher.notificationUnreadCount(unreadCountEvent);
    await notificationsPublisher.publishUnreadCount(unreadCountEvent);

    // Update vendor stats
    const totalPendingUsers = await prisma.user.count({
      where: { 
        verified_at: null,
        role: 'VENDOR'
      }
    });

    // Update reviewer stats  
    eventsPublisher.statsUpdate({
      scope: 'reviewer',
      changes: {
        pendingUserVerifications: totalPendingUsers
      }
    });

    console.log(`✅ Notified user about verification result: ${userId} - ${verificationStatus}`);

  } catch (error) {
    console.error('Error notifying user verification result:', error);
  }
}

// notifyReviewerFinalDecision function removed - reviewers no longer need notification when submissions are approved/rejected

export async function notifyReviewerSubmissionApproved(submissionId: string) {
  try {
    // Get submission details
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { 
        user: true,
        approved_by_final_user: true
      }
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    // Only notify if submission is approved
    if (submission.approval_status !== 'APPROVED') {
      return;
    }

    const notificationTitle = 'Pengajuan Simlok Disetujui';
    const notificationMessage = `Pengajuan dari ${submission.vendor_name} - ${submission.officer_name} telah disetujui oleh Approver`;

    // Create notification record for reviewers
    const notification = await prisma.notification.create({
      data: {
        scope: 'reviewer',
        type: 'submission_approved',
        title: notificationTitle,
        message: notificationMessage,
        data: JSON.stringify({
          submissionId,
          vendorName: submission.vendor_name,
          officerName: submission.officer_name,
          jobDescription: submission.job_description,
          approvedBy: submission.approved_by_final_user?.officer_name,
          finalStatus: submission.approval_status,
          simlokNumber: submission.simlok_number,
          approvedAt: submission.approved_at
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
    const totalApproved = await prisma.submission.count({
      where: { approval_status: 'APPROVED' }
    });

    eventsPublisher.statsUpdate({
      scope: 'reviewer',
      changes: {
        approvedSubmissions: totalApproved,
        totalSubmissions: await prisma.submission.count()
      }
    });

    console.log(`✅ Notified reviewers about approved submission: ${submissionId}`);

  } catch (error) {
    console.error('Error notifying reviewers about approved submission:', error);
  }
}
