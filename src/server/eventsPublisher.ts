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
    } else if (payload.scope === 'vendor' && payload.vendorId) {
      this.emitToVendor(payload.vendorId, EVENT_NAMES.STATS_UPDATE, payload);
    }
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
