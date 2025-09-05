import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from '../lib/redis';
import { EVENT_NAMES, ROOMS } from '../shared/events';
import type { 
  AdminNewSubmissionEvent,
  AdminNewVendorEvent,
  VendorSubmissionStatusChangedEvent,
  NotificationNewEvent,
  NotificationUnreadCountEvent,
  StatsUpdateEvent
} from '../shared/events';

declare global {
  var __socket_io: Server | undefined;
}

let io: Server;

// Use global Socket.IO instance from custom server or create new one
if (typeof globalThis !== 'undefined' && (globalThis as any).__socket_io) {
  io = (globalThis as any).__socket_io;
} else {
  // Fallback for development or API routes
  if (process.env.NODE_ENV === 'production') {
    io = new Server({
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });
  } else {
    if (!globalThis.__socket_io) {
      globalThis.__socket_io = new Server({
        cors: {
          origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
          methods: ['GET', 'POST'],
        },
      });
    }
    io = globalThis.__socket_io;
  }

  // Set up Redis adapter only if not already set
  if (!io.adapter || io.adapter.constructor.name === 'Adapter') {
    try {
      io.adapter(createAdapter(pubClient, subClient));
      console.log('Redis adapter attached to Socket.IO');
    } catch (error) {
      console.error('Failed to attach Redis adapter:', error);
    }
  }
}

// Connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join rooms based on user role and vendor ID
  socket.on('join', (data: { role: string; vendorId?: string }) => {
    try {
      const { role, vendorId } = data;
      
      if (role === 'ADMIN') {
        socket.join(ROOMS.ADMIN);
        console.log(`Socket ${socket.id} joined admin room`);
      } else if (role === 'VENDOR' && vendorId) {
        socket.join(ROOMS.VENDOR(vendorId));
        console.log(`Socket ${socket.id} joined vendor room: ${vendorId}`);
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Helper functions for emitting events
export const emitToAdmin = (event: string, payload: any) => {
  io.to(ROOMS.ADMIN).emit(event, payload);
};

export const emitToVendor = (vendorId: string, event: string, payload: any) => {
  io.to(ROOMS.VENDOR(vendorId)).emit(event, payload);
};

export const emitBroadcast = (event: string, payload: any) => {
  io.emit(event, payload);
};

// Typed emit functions
export const emitAdminNewSubmission = (payload: AdminNewSubmissionEvent) => {
  emitToAdmin(EVENT_NAMES.ADMIN_NEW_SUBMISSION, payload);
};

export const emitAdminNewVendor = (payload: AdminNewVendorEvent) => {
  emitToAdmin(EVENT_NAMES.ADMIN_NEW_VENDOR, payload);
};

export const emitVendorSubmissionStatusChanged = (vendorId: string, payload: VendorSubmissionStatusChangedEvent) => {
  emitToVendor(vendorId, EVENT_NAMES.VENDOR_SUBMISSION_STATUS_CHANGED, payload);
};

export const emitNotificationNew = (scope: 'admin' | 'vendor', vendorId: string | undefined, payload: NotificationNewEvent) => {
  if (scope === 'admin') {
    emitToAdmin(EVENT_NAMES.NOTIFICATION_NEW, payload);
  } else if (scope === 'vendor' && vendorId) {
    emitToVendor(vendorId, EVENT_NAMES.NOTIFICATION_NEW, payload);
  }
};

export const emitNotificationUnreadCount = (scope: 'admin' | 'vendor', vendorId: string | undefined, payload: NotificationUnreadCountEvent) => {
  if (scope === 'admin') {
    emitToAdmin(EVENT_NAMES.NOTIFICATION_UNREAD_COUNT, payload);
  } else if (scope === 'vendor' && vendorId) {
    emitToVendor(vendorId, EVENT_NAMES.NOTIFICATION_UNREAD_COUNT, payload);
  }
};

export const emitStatsUpdate = (scope: 'admin' | 'vendor', vendorId: string | undefined, payload: StatsUpdateEvent) => {
  if (scope === 'admin') {
    emitToAdmin(EVENT_NAMES.STATS_UPDATE, payload);
  } else if (scope === 'vendor' && vendorId) {
    emitToVendor(vendorId, EVENT_NAMES.STATS_UPDATE, payload);
  }
};

export { io };
