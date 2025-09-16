import { z } from 'zod';

// Event schemas
export const AdminNewSubmissionEvent = z.object({
  submissionId: z.string(),
  createdAt: z.string(),
});

export const AdminNewVendorEvent = z.object({
  vendorId: z.string(),
  createdAt: z.string(),
});

export const VendorSubmissionStatusChangedEvent = z.object({
  submissionId: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  updatedAt: z.string(),
});

export const NotificationNewEvent = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.string().nullable().optional(),
  scope: z.enum(['admin', 'vendor']),
  vendorId: z.string().optional(),
  createdAt: z.string(),
});

export const NotificationUnreadCountEvent = z.object({
  scope: z.enum(['admin', 'vendor']),
  vendorId: z.string().optional(),
  unreadCount: z.number(),
  count: z.number(), // Legacy field for backward compatibility
});

export const GetNotificationsSchema = z.object({
  scope: z.enum(['admin', 'vendor']),
  vendorId: z.string().optional().nullable(),
  cursor: z.string().optional().nullable(),
  limit: z.number().int().positive().max(100).default(10).optional(),
});

export const StatsUpdateEvent = z.object({
  scope: z.enum(['admin', 'vendor']),
  vendorId: z.string().optional(),
  changes: z.record(z.string(), z.union([z.number(), z.string()])),
});

export const NotificationRemovedEvent = z.object({
  submissionId: z.string(),
  timestamp: z.string(),
});

// Event types
export type AdminNewSubmissionEvent = z.infer<typeof AdminNewSubmissionEvent>;
export type AdminNewVendorEvent = z.infer<typeof AdminNewVendorEvent>;
export type VendorSubmissionStatusChangedEvent = z.infer<typeof VendorSubmissionStatusChangedEvent>;
export type NotificationNewEvent = z.infer<typeof NotificationNewEvent>;
export type NotificationUnreadCountEvent = z.infer<typeof NotificationUnreadCountEvent>;
export type StatsUpdateEvent = z.infer<typeof StatsUpdateEvent>;
export type NotificationRemovedEvent = z.infer<typeof NotificationRemovedEvent>;

// Event names
export const EVENT_NAMES = {
  ADMIN_NEW_SUBMISSION: 'admin:new_submission',
  ADMIN_NEW_VENDOR: 'admin:new_vendor',
  VENDOR_SUBMISSION_STATUS_CHANGED: 'vendor:submission_status_changed',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_UNREAD_COUNT: 'notification:unread_count',
  NOTIFICATION_REMOVED: 'notification:removed',
  STATS_UPDATE: 'stats:update',
} as const;

// Room names
export const ROOMS = {
  ADMIN: 'admin',
  VENDOR: (vendorId: string) => `vendor:${vendorId}`,
} as const;
