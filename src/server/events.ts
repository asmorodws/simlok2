import { prisma } from '@/lib/prisma';
import { 
  emitAdminNewSubmission,
  emitAdminNewVendor,
  emitVendorSubmissionStatusChanged,
  emitNotificationNew,
  emitNotificationUnreadCount,
  emitStatsUpdate
} from './socket';
import type { 
  AdminNewSubmissionEvent,
  AdminNewVendorEvent,
  VendorSubmissionStatusChangedEvent,
  NotificationNewEvent
} from '../shared/events';

// Helper to count unread notifications
async function getUnreadCount(scope: 'admin' | 'vendor', vendorId?: string): Promise<number> {
  if (scope === 'admin') {
    return await prisma.notification.count({
      where: {
        scope: 'admin',
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
      title: notification.title,
      message: notification.message,
      scope: 'admin',
      createdAt: notification.created_at.toISOString()
    };

    emitAdminNewSubmission(submissionEvent);
    emitNotificationNew('admin', undefined, notificationEvent);

    // Update unread count
    const unreadCount = await getUnreadCount('admin');
    emitNotificationUnreadCount('admin', undefined, {
      scope: 'admin',
      unreadCount: unreadCount,
      count: unreadCount
    });

    // Update stats
    const totalPending = await prisma.submission.count({
      where: { approval_status: 'PENDING' }
    });

    emitStatsUpdate('admin', undefined, {
      scope: 'admin',
      changes: {
        pendingSubmissions: totalPending,
        totalSubmissions: await prisma.submission.count()
      }
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
      title: notification.title,
      message: notification.message,
      scope: 'admin',
      createdAt: notification.created_at.toISOString()
    };

    emitAdminNewVendor(vendorEvent);
    emitNotificationNew('admin', undefined, notificationEvent);

    // Update unread count
    const unreadCount = await getUnreadCount('admin');
    emitNotificationUnreadCount('admin', undefined, {
      scope: 'admin',
      unreadCount: unreadCount,
      count: unreadCount
    });

    // Update stats
    const totalVendors = await prisma.user.count({
      where: { role: 'VENDOR' }
    });

    emitStatsUpdate('admin', undefined, {
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

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        scope: 'vendor',
        vendor_id: vendorId,
        type: 'status_change',
        title: 'Status Pengajuan Berubah',
        message: `Pengajuan "${submission.job_description}" ${statusText.toLowerCase()}`,
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
      title: notification.title,
      message: notification.message,
      scope: 'vendor',
      vendorId,
      createdAt: notification.created_at.toISOString()
    };

    emitVendorSubmissionStatusChanged(vendorId, statusEvent);
    emitNotificationNew('vendor', vendorId, notificationEvent);

    // Update unread count
    const unreadCount = await getUnreadCount('vendor', vendorId);
    emitNotificationUnreadCount('vendor', vendorId, {
      scope: 'vendor',
      vendorId,
      unreadCount: unreadCount,
      count: unreadCount
    });

    // Update vendor stats
    const vendorSubmissions = await prisma.submission.findMany({
      where: { user_id: vendorId }
    });

    const stats = {
      totalSubmissions: vendorSubmissions.length,
      pendingSubmissions: vendorSubmissions.filter((s: any) => s.approval_status === 'PENDING').length,
      approvedSubmissions: vendorSubmissions.filter((s: any) => s.approval_status === 'APPROVED').length,
      rejectedSubmissions: vendorSubmissions.filter((s: any) => s.approval_status === 'REJECTED').length
    };

    emitStatsUpdate('vendor', vendorId, {
      scope: 'vendor',
      vendorId,
      changes: stats
    });

  } catch (error) {
    console.error('Error notifying vendor status change:', error);
  }
}
