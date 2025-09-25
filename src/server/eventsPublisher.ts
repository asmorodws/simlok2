/**
 * Events Publisher Service
 * Handles all business event emissions to Socket.IO rooms
 */

import { getSocketIO } from '@/lib/singletons';
import { EVENT_NAMES, ROOMS } from '@/shared/events';
import type {
  AdminNewSubmissionEvent,
  AdminNewVendorEvent,
  VendorSubmissionStatusChangedEvent,
  NotificationNewEvent,
  NotificationUnreadCountEvent,
  StatsUpdateEvent,
} from '@/shared/events';

class EventsPublisher {
  private io = getSocketIO();

  /**
   * Get Socket.IO instance (refreshed each call for HMR safety)
   */
  private getIO() {
    if (!this.io) {
      this.io = getSocketIO();
    }
    return this.io;
  }

  /**
   * Emit event to admin room
   */
  private emitToAdmin(event: string, payload: any) {
    const io = this.getIO();
    if (io) {
      io.to(ROOMS.ADMIN).emit(event, payload);
      console.log(`[Events] Emitted ${event} to admin room:`, payload);
    } else {
      console.warn(`[Events] Socket.IO not available for event: ${event}`);
    }
  }

  /**
   * Emit event to reviewer room
   */
  private emitToReviewer(event: string, payload: any) {
    const io = this.getIO();
    if (io) {
      io.to(ROOMS.REVIEWER).emit(event, payload);
      console.log(`[Events] Emitted ${event} to reviewer room:`, payload);
    } else {
      console.warn(`[Events] Socket.IO not available for event: ${event}`);
    }
  }

  /**
   * Emit event to approver room
   */
  private emitToApprover(event: string, payload: any) {
    const io = this.getIO();
    if (io) {
      io.to(ROOMS.APPROVER).emit(event, payload);
      console.log(`[Events] Emitted ${event} to approver room:`, payload);
    } else {
      console.warn(`[Events] Socket.IO not available for event: ${event}`);
    }
  }

  /**
   * Emit event to specific vendor room
   */
  private emitToVendor(vendorId: string, event: string, payload: any) {
    const io = this.getIO();
    if (io) {
      io.to(ROOMS.VENDOR(vendorId)).emit(event, payload);
      console.log(`[Events] Emitted ${event} to vendor ${vendorId}:`, payload);
    } else {
      console.warn(`[Events] Socket.IO not available for event: ${event}`);
    }
  }

  /**
   * Emit new submission event to admin
   */
  adminNewSubmission(payload: AdminNewSubmissionEvent) {
    this.emitToAdmin(EVENT_NAMES.ADMIN_NEW_SUBMISSION, payload);
  }

  /**
   * Emit new vendor registration to admin
   */
  adminNewVendor(payload: AdminNewVendorEvent) {
    this.emitToAdmin(EVENT_NAMES.ADMIN_NEW_VENDOR, payload);
  }

  /**
   * Emit submission status change to specific vendor
   */
  vendorSubmissionStatusChanged(vendorId: string, payload: VendorSubmissionStatusChangedEvent) {
    this.emitToVendor(vendorId, EVENT_NAMES.VENDOR_SUBMISSION_STATUS_CHANGED, payload);
  }

  /**
   * Emit new notification
   */
  notificationNew(payload: NotificationNewEvent) {
    if (payload.scope === 'admin') {
      this.emitToAdmin(EVENT_NAMES.NOTIFICATION_NEW, payload);
    } else if (payload.scope === 'reviewer') {
      this.emitToReviewer(EVENT_NAMES.NOTIFICATION_NEW, payload);
    } else if (payload.scope === 'approver') {
      this.emitToApprover(EVENT_NAMES.NOTIFICATION_NEW, payload);
    } else if (payload.scope === 'vendor' && payload.vendorId) {
      this.emitToVendor(payload.vendorId, EVENT_NAMES.NOTIFICATION_NEW, payload);
    }
  }

  /**
   * Emit unread notification count update
   */
  notificationUnreadCount(payload: NotificationUnreadCountEvent) {
    if (payload.scope === 'admin') {
      this.emitToAdmin(EVENT_NAMES.NOTIFICATION_UNREAD_COUNT, payload);
    } else if (payload.scope === 'reviewer') {
      this.emitToReviewer(EVENT_NAMES.NOTIFICATION_UNREAD_COUNT, payload);
    } else if (payload.scope === 'approver') {
      this.emitToApprover(EVENT_NAMES.NOTIFICATION_UNREAD_COUNT, payload);
    } else if (payload.scope === 'vendor' && payload.vendorId) {
      this.emitToVendor(payload.vendorId, EVENT_NAMES.NOTIFICATION_UNREAD_COUNT, payload);
    }
  }

  /**
   * Emit stats update
   */
  statsUpdate(payload: StatsUpdateEvent) {
    if (payload.scope === 'admin') {
      this.emitToAdmin(EVENT_NAMES.STATS_UPDATE, payload);
    } else if (payload.scope === 'reviewer') {
      this.emitToReviewer(EVENT_NAMES.STATS_UPDATE, payload);
    } else if (payload.scope === 'approver') {
      this.emitToApprover(EVENT_NAMES.STATS_UPDATE, payload);
    } else if (payload.scope === 'vendor' && payload.vendorId) {
      this.emitToVendor(payload.vendorId, EVENT_NAMES.STATS_UPDATE, payload);
    }
  }

  /**
   * Emit notification removal (broadcast to all clients)
   */
  notificationRemoved(payload: { submissionId: string; timestamp: string }) {
    this.broadcast(EVENT_NAMES.NOTIFICATION_REMOVED, payload);
  }

  /**
   * Emit submission reviewed event to approvers
   */
  submissionReviewed(payload: { submissionId: string; reviewStatus: string; reviewedBy: string; reviewedAt: string }) {
    this.emitToApprover('submission:reviewed', payload);
  }

  /**
   * Emit submission created event to reviewers
   */
  submissionCreated(payload: { submissionId: string; vendorName: string; officerName: string; createdAt: string }) {
    this.emitToReviewer('submission:created', payload);
  }

  /**
   * Emit submission finalized event to vendor
   */
  submissionFinalized(vendorId: string, payload: { submissionId: string; finalStatus: string; finalizedBy: string; finalizedAt: string }) {
    this.emitToVendor(vendorId, 'submission:finalized', payload);
  }

  /**
   * Emit user verification needed event to reviewers
   */
  userVerificationNeeded(payload: { userId: string; vendorName: string; officerName: string; email: string; createdAt: string }) {
    this.emitToReviewer('user:verification-needed', payload);
  }

  /**
   * Emit user verification result event to specific vendor
   */
  userVerificationResult(vendorId: string, payload: { userId: string; status: string; verifiedAt: string; note: string }) {
    this.emitToVendor(vendorId, 'user:verification-result', payload);
  }

  /**
   * Emit to all connected clients (use sparingly)
   */
  broadcast(event: string, payload: any) {
    const io = this.getIO();
    if (io) {
      io.emit(event, payload);
      console.log(`[Events] Broadcasted ${event}:`, payload);
    } else {
      console.warn(`[Events] Socket.IO not available for broadcast: ${event}`);
    }
  }
}

// Export singleton instance
export const eventsPublisher = new EventsPublisher();
