/**
 * Shared DTOs and validation schemas for API routes
 */

import { z } from 'zod';

// Common response schemas
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export const ApiSuccessSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  message: z.string().optional(),
});

// Pagination schemas
export const PaginationQuerySchema = z.object({
  cursor: z.string().optional().nullable(),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const PaginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    nextCursor: z.string().nullable(),
    hasMore: z.boolean(),
    total: z.number().optional(),
  }),
});

// Notification schemas
export const NotificationsQuerySchema = z.object({
  scope: z.enum(['admin', 'vendor']),
  vendorId: z.string().optional().nullable(),
}).merge(PaginationQuerySchema);

export const NotificationSchema = z.object({
  id: z.string(),
  scope: z.enum(['admin', 'vendor']),
  vendorId: z.string().nullable(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.string().nullable(),
  createdAt: z.string(),
  isRead: z.boolean(),
});

export const MarkAsReadSchema = z.object({
  notificationId: z.string(),
});

export const MarkAllAsReadSchema = z.object({
  scope: z.enum(['admin', 'vendor']),
  vendorId: z.string().optional().nullable(),
});

// Submission schemas
export const SubmissionStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const CreateSubmissionSchema = z.object({
  vendor_name: z.string().min(1),
  based_on: z.string().min(1),
  officer_name: z.string().min(1),
  job_description: z.string().min(1),
  work_location: z.string().min(1),
  implementation: z.string().optional(),
  working_hours: z.string().min(1),
  other_notes: z.string().optional(),
  work_facilities: z.string().min(1),
  worker_names: z.string().min(1),
  content: z.string().optional(),
  notes: z.string().optional(),
  signer_position: z.string().optional(),
  signer_name: z.string().optional(),
});

export const UpdateSubmissionStatusSchema = z.object({
  status: SubmissionStatusSchema,
  notes: z.string().optional(),
});

// User/Vendor schemas
export const CreateVendorSchema = z.object({
  officer_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  vendor_name: z.string().min(1),
  address: z.string().optional(),
  phone_number: z.string().optional(),
});

export const UpdateVendorStatusSchema = z.object({
  verified: z.boolean(),
});

// Stats schemas
export const StatsQuerySchema = z.object({
  scope: z.enum(['admin', 'vendor']),
  vendorId: z.string().optional().nullable(),
  range: z.enum(['day', 'week', 'month', 'year']).default('month'),
});

// Type exports
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiSuccess = z.infer<typeof ApiSuccessSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type PaginatedResponse = z.infer<typeof PaginatedResponseSchema>;
export type NotificationsQuery = z.infer<typeof NotificationsQuerySchema>;
export type NotificationDto = z.infer<typeof NotificationSchema>;
export type CreateSubmissionDto = z.infer<typeof CreateSubmissionSchema>;
export type UpdateSubmissionStatusDto = z.infer<typeof UpdateSubmissionStatusSchema>;
export type CreateVendorDto = z.infer<typeof CreateVendorSchema>;
export type StatsQuery = z.infer<typeof StatsQuerySchema>;
