import { prisma, redisPub } from '@/lib/database';
import { emitNotificationNew, emitNotificationUnreadCount } from './socket';

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

    console.log('New submission notification created:', notification.id);
    // Publish to Redis so SSE clients receive it and also emit via Socket.IO if available
    try {
      const channel = 'notifications:admin';
      const payload = {
        type: 'notification:new',
        data: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          scope: notification.scope,
          vendorId: notification.vendor_id,
          createdAt: notification.created_at?.toISOString?.() || new Date().toISOString(),
        }
      };

      await redisPub.publish(channel, JSON.stringify(payload));
      // Also emit via websocket in-memory if socket server is initialized
      emitNotificationNew('admin', undefined, payload.data as any);
    } catch (err) {
      console.warn('Failed to publish new admin notification to Redis/socket:', err);
    }

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
    const _notification = await prisma.notification.create({
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

    console.log('New vendor notification created:', _notification.id);
    try {
      const channel = 'notifications:admin';
      const payload = {
        type: 'notification:new',
        data: {
          id: _notification.id,
          type: _notification.type,
          title: _notification.title,
          message: _notification.message,
          data: _notification.data,
          scope: _notification.scope,
          vendorId: _notification.vendor_id,
          createdAt: _notification.created_at?.toISOString?.() || new Date().toISOString(),
        }
      };
      await redisPub.publish(channel, JSON.stringify(payload));
      emitNotificationNew('admin', undefined, payload.data as any);
    } catch (err) {
      console.warn('Failed to publish new vendor notification to Redis/socket:', err);
    }

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
    const _notification = await prisma.notification.create({
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

    console.log('Vendor status change notification created:', _notification.id);
    try {
      const channel = `notifications:vendor:${vendorId}`;
      const payload = {
        type: 'notification:new',
        data: {
          id: _notification.id,
          type: _notification.type,
          title: _notification.title,
          message: _notification.message,
          data: _notification.data,
          scope: _notification.scope,
          vendorId: _notification.vendor_id,
          createdAt: _notification.created_at?.toISOString?.() || new Date().toISOString(),
        }
      };
      await redisPub.publish(channel, JSON.stringify(payload));
      emitNotificationNew('vendor', vendorId, payload.data as any);

      // Publish unread count for vendor channel
      const total = await prisma.notification.count({ where: { scope: 'vendor', vendor_id: vendorId } });
      const read = await prisma.notificationRead.count({ where: { vendor_id: vendorId } });
      const unread = Math.max(0, total - read);
      const unreadPayload = { type: 'notification:unread_count', data: { vendorId, scope: 'vendor', unreadCount: unread, count: unread } };
      await redisPub.publish(`notifications:vendor:${vendorId}`, JSON.stringify(unreadPayload));
      emitNotificationUnreadCount('vendor', vendorId, { vendorId, scope: 'vendor', unreadCount: unread, count: unread });
    } catch (err) {
      console.warn('Failed to publish vendor status change notification to Redis/socket:', err);
    }

  } catch (error) {
    console.error('Error notifying vendor status change:', error);
  }
}

export async function notifyNotificationsRemoved(submissionId: string) {
  try {
    console.log(`Broadcasting notification removal for submission: ${submissionId}`);
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
    await prisma.notification.create({
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

    console.log(`✅ Notified reviewers about new user: ${userId}`);
    try {
      const channel = 'notifications:reviewer';
      const lastCreated = await prisma.notification.findFirst({ where: { scope: 'reviewer' }, orderBy: { created_at: 'desc' } });
      if (lastCreated) {
        const payload = {
          type: 'notification:new',
          data: {
            id: lastCreated.id,
            type: lastCreated.type,
            title: lastCreated.title,
            message: lastCreated.message,
            data: lastCreated.data,
            scope: lastCreated.scope,
            vendorId: lastCreated.vendor_id,
            createdAt: lastCreated.created_at?.toISOString?.() || new Date().toISOString(),
          }
        };
        await redisPub.publish(channel, JSON.stringify(payload));
        emitNotificationNew('reviewer', undefined, payload.data as any);

        // publish unread count for reviewer
        const total = await prisma.notification.count({ where: { scope: 'reviewer' } });
        const read = await prisma.notificationRead.count();
        const unread = Math.max(0, total - read);
        const unreadPayload = { type: 'notification:unread_count', data: { scope: 'reviewer', unreadCount: unread, count: unread } };
        await redisPub.publish('notifications:reviewer', JSON.stringify(unreadPayload));
        emitNotificationUnreadCount('reviewer', undefined, { scope: 'reviewer', unreadCount: unread, count: unread } as any);
      }
    } catch (err) {
      console.warn('Failed to publish reviewer new user notification to Redis/socket:', err);
    }

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
    await prisma.notification.create({
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

    console.log(`✅ Notified reviewers about new submission: ${submissionId}`);
    try {
      const channel = 'notifications:reviewer';
      const lastCreated = await prisma.notification.findFirst({ where: { scope: 'reviewer' }, orderBy: { created_at: 'desc' } });
      if (lastCreated) {
        const payload = {
          type: 'notification:new',
          data: {
            id: lastCreated.id,
            type: lastCreated.type,
            title: lastCreated.title,
            message: lastCreated.message,
            data: lastCreated.data,
            scope: lastCreated.scope,
            vendorId: lastCreated.vendor_id,
            createdAt: lastCreated.created_at?.toISOString?.() || new Date().toISOString(),
          }
        };
        await redisPub.publish(channel, JSON.stringify(payload));
        emitNotificationNew('reviewer', undefined, payload.data as any);

        // publish simple unread count for reviewer scope (global)
        const total = await prisma.notification.count({ where: { scope: 'reviewer' } });
        const read = await prisma.notificationRead.count();
        const unread = Math.max(0, total - read);
        const unreadPayload = { type: 'notification:unread_count', data: { scope: 'reviewer', unreadCount: unread, count: unread } };
        await redisPub.publish('notifications:reviewer', JSON.stringify(unreadPayload));
        emitNotificationUnreadCount('reviewer', undefined, { scope: 'reviewer', unreadCount: unread, count: unread } as any);
      }
    } catch (err) {
      console.warn('Failed to publish reviewer notification/new-count to Redis/socket:', err);
    }

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
        user: true
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
    await prisma.notification.create({
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
          reviewedBy: submission.reviewed_by,
          reviewStatus: submission.review_status,
          reviewNote: submission.note_for_approver
        })
      }
    });

    console.log(`✅ Notified approvers about reviewed submission: ${submissionId}`);
    try {
      const channel = 'notifications:approver';
      const lastCreated = await prisma.notification.findFirst({ where: { scope: 'approver' }, orderBy: { created_at: 'desc' } });
      if (lastCreated) {
        const payload = {
          type: 'notification:new',
          data: {
            id: lastCreated.id,
            type: lastCreated.type,
            title: lastCreated.title,
            message: lastCreated.message,
            data: lastCreated.data,
            scope: lastCreated.scope,
            vendorId: lastCreated.vendor_id,
            createdAt: lastCreated.created_at?.toISOString?.() || new Date().toISOString(),
          }
        };
        await redisPub.publish(channel, JSON.stringify(payload));
        emitNotificationNew('approver', undefined, payload.data as any);

        // publish unread count for approver
        const total = await prisma.notification.count({ where: { scope: 'approver' } });
        const read = await prisma.notificationRead.count();
        const unread = Math.max(0, total - read);
        const unreadPayload = { type: 'notification:unread_count', data: { scope: 'approver', unreadCount: unread, count: unread } };
        await redisPub.publish('notifications:approver', JSON.stringify(unreadPayload));
        emitNotificationUnreadCount('approver', undefined, { scope: 'approver', unreadCount: unread, count: unread } as any);
      }
    } catch (err) {
      console.warn('Failed to publish approver reviewed notification to Redis/socket:', err);
    }

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

    // Notification details (currently just logging, can be used for future notifications)
    void verificationStatus; // Mark as intentionally unused
    void note; // Mark as intentionally unused

    console.log(`✅ Notified user about verification result: ${userId} - ${verificationStatus}`);

  } catch (error) {
    console.error('Error notifying user verification result:', error);
  }
}

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
    await prisma.notification.create({
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

    console.log(`✅ Notified reviewers about approved submission: ${submissionId}`);
    try {
      const channel = 'notifications:reviewer';
      const lastCreated = await prisma.notification.findFirst({ where: { scope: 'reviewer' }, orderBy: { created_at: 'desc' } });
      if (lastCreated) {
        const payload = {
          type: 'notification:new',
          data: {
            id: lastCreated.id,
            type: lastCreated.type,
            title: lastCreated.title,
            message: lastCreated.message,
            data: lastCreated.data,
            scope: lastCreated.scope,
            vendorId: lastCreated.vendor_id,
            createdAt: lastCreated.created_at?.toISOString?.() || new Date().toISOString(),
          }
        };
        await redisPub.publish(channel, JSON.stringify(payload));
        emitNotificationNew('reviewer', undefined, payload.data as any);
      }
    } catch (err) {
      console.warn('Failed to publish reviewer approved notification to Redis/socket:', err);
    }

  } catch (error) {
    console.error('Error notifying reviewers about approved submission:', error);
  }
}