/**
 * Zod Validation Schemas for API Endpoints
 * 
 * Centralized validation schemas for API request bodies and query parameters.
 * Provides type-safe validation and consistent error messages.
 */

import { z } from 'zod';

/**
 * Common field validations
 */
export const CommonSchemas = {
  // ID validation (cuid format)
  id: z.string().cuid('Invalid ID format'),
  
  // Email validation
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(100, 'Email too long')
    .toLowerCase(),
  
  // Phone number validation (Indonesia)
  phoneNumber: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(15, 'Phone number must be at most 15 digits')
    .regex(/^[0-9+\-\s]+$/, 'Phone number can only contain digits, +, -, and spaces')
    .trim(),
  
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
  
  // Date string validation (YYYY-MM-DD)
  dateString: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  
  // Pagination
  paginationParams: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
};

/**
 * Query parameter schemas
 */
export const QuerySchemas = {
  // Basic pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
  
  // Date range filter
  dateRange: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }).refine(
    (data) => {
      if (data.dateFrom && data.dateTo) {
        return new Date(data.dateFrom) <= new Date(data.dateTo);
      }
      return true;
    },
    { message: 'dateFrom must be before or equal to dateTo' }
  ),
  
  // QR scan query
  qrScanQuery: z.object({
    submission_id: z.string().optional(),
    search: z.string().optional(),
    status: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    location: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  }),
};

/**
 * QR Verification schemas
 */
export const QrSchemas = {
  // QR verify request
  qrVerify: z.object({
    qrData: z.string().optional(),
    qr_data: z.string().optional(),
    scanLocation: z.string().optional(),
    scanner_type: z.enum(['QR', 'BARCODE']).optional(),
  }).refine(
    (data) => data.qrData || data.qr_data,
    { message: 'Either qrData or qr_data is required' }
  ),
};

/**
 * Submission schemas
 */
export const SubmissionSchemas = {
  // Create submission
  create: z.object({
    vendor_name: z.string().min(2).max(150).trim(),
    vendor_phone: z.string().min(10).max(15).regex(/^[0-9+\-\s]+$/).trim().optional(),
    work_location: z.string().min(5).max(200).trim(),
    job_description: z.string().min(10).max(1000).trim(),
    based_on: z.string().max(500).trim().optional(),
    working_hours: z.string().max(100).trim().optional(),
    holiday_working_hours: z.string().max(100).trim().optional(),
    implementation: z.string().max(1000).trim().optional(),
    content: z.string().max(2000).trim().optional(),
    worker_count: z.number().int().min(1).max(1000).optional(),
    implementation_start_date: z.string().optional(),
    implementation_end_date: z.string().optional(),
    workers: z.array(z.object({
      name: z.string().min(2).max(100).trim(),
      id_number: z.string().min(5).max(50).trim(),
      id_card_photo_url: z.string().url().optional(),
      photo_url: z.string().url().optional(),
    })).optional(),
    support_documents: z.array(z.object({
      document_type: z.enum(['SIMJA', 'SIKA', 'HSSE_PASS', 'OTHER']),
      document_number: z.string().max(100).trim().optional(),
      document_date: z.string().optional(),
      file_url: z.string().url(),
    })).optional(),
    simja_documents: z.array(z.object({
      document_number: z.string().max(100).trim(),
      document_date: z.string(),
    })).optional(),
  }).refine(
    (data) => {
      if (data.implementation_start_date && data.implementation_end_date) {
        return new Date(data.implementation_start_date) <= new Date(data.implementation_end_date);
      }
      return true;
    },
    { message: 'Start date must be before or equal to end date', path: ['implementation_start_date'] }
  ),
  
  // Update submission
  update: z.object({
    vendor_name: z.string().min(2).max(150).trim().optional(),
    vendor_phone: z.string().min(10).max(15).regex(/^[0-9+\-\s]+$/).trim().optional(),
    work_location: z.string().min(5).max(200).trim().optional(),
    job_description: z.string().min(10).max(1000).trim().optional(),
    based_on: z.string().max(500).trim().optional(),
    working_hours: z.string().max(100).trim().optional(),
    holiday_working_hours: z.string().max(100).trim().optional(),
    implementation: z.string().max(1000).trim().optional(),
    content: z.string().max(2000).trim().optional(),
    worker_count: z.number().int().min(1).max(1000).optional(),
    implementation_start_date: z.string().optional(),
    implementation_end_date: z.string().optional(),
  }),
  
  // Review submission
  review: z.object({
    review_status: z.enum(['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS']),
    note_for_approver: z.string().max(1000).trim().optional(),
    note_for_vendor: z.string().max(1000).trim().optional(),
    working_hours: z.string().max(100).trim().optional(),
    holiday_working_hours: z.string().max(100).trim().optional(),
    implementation: z.string().max(1000).trim().optional(),
    content: z.string().max(2000).trim().optional(),
    implementation_start_date: z.string().optional(),
    implementation_end_date: z.string().optional(),
  }),
  
  // Approve submission
  approve: z.object({
    approval_status: z.enum(['APPROVED', 'REJECTED']),
    note_for_vendor: z.string().max(1000).trim().optional(),
    simlok_number: z.string().max(100).trim().optional(),
    simlok_date: z.string().optional(),
  }),
  
  // Resubmit
  resubmit: z.object({
    message: z.string().max(1000).trim().optional(),
  }),
  
  // Query submissions
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.string().optional(),
    reviewStatus: z.string().optional(),
    finalStatus: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.string().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    vendor: z.string().optional(),
    stats: z.enum(['true', 'false']).optional(),
  }),
};

/**
 * User management schemas
 */
export const UserSchemas = {
  // Create user
  create: z.object({
    officer_name: z.string().min(2).max(100).trim(),
    vendor_name: z.string().min(2).max(150).trim().optional(),
    email: CommonSchemas.email,
    phone_number: CommonSchemas.phoneNumber.optional(),
    address: z.string().min(10).max(500).trim().optional(),
    role: z.enum(['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'SUPER_ADMIN']),
    password: CommonSchemas.password,
  }).refine(
    (data) => {
      // Vendor role requires vendor_name
      if (data.role === 'VENDOR' && (!data.vendor_name || data.vendor_name.trim() === '')) {
        return false;
      }
      return true;
    },
    {
      message: 'Vendor name is required for VENDOR role',
      path: ['vendor_name'],
    }
  ),
  
  // Update user
  update: z.object({
    officer_name: z.string().min(2).max(100).trim().optional(),
    vendor_name: z.string().min(2).max(150).trim().optional(),
    email: CommonSchemas.email.optional(),
    phone_number: CommonSchemas.phoneNumber.optional(),
    address: z.string().min(10).max(500).trim().optional(),
    role: z.enum(['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'SUPER_ADMIN']).optional(),
    password: CommonSchemas.password.optional(),
    position: z.string().max(100).trim().optional(),
    verification_status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  }),
  
  // Verify user
  verify: z.object({
    action: z.enum(['VERIFY', 'REJECT']),
    rejection_reason: z.string().min(10).max(500).trim().optional(),
  }).refine(
    (data) => {
      // Rejection requires reason
      if (data.action === 'REJECT' && !data.rejection_reason) {
        return false;
      }
      return true;
    },
    {
      message: 'Rejection reason is required when rejecting',
      path: ['rejection_reason'],
    }
  ),
  
  // Change password
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: CommonSchemas.password,
    confirmPassword: z.string(),
  }).refine(
    (data) => data.newPassword === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  ),
  
  // Query users
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().optional(),
    status: z.enum(['pending', 'verified', 'rejected']).optional(),
    role: z.enum(['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'SUPER_ADMIN']).optional(),
    sortBy: z.string().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
};

/**
 * Worker schemas
 */
export const WorkerSchemas = {
  // Create worker
  create: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
    id_number: z.string().min(5, 'ID number must be at least 5 characters').max(50).trim(),
    id_card_photo_url: z.string().url('Invalid URL').optional(),
    photo_url: z.string().url('Invalid URL').optional(),
  }),
  
  // Update worker
  update: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    id_number: z.string().min(5).max(50).trim().optional(),
    id_card_photo_url: z.string().url().optional(),
    photo_url: z.string().url().optional(),
  }),
};

/**
 * Upload schemas
 */
export const UploadSchemas = {
  // File upload
  fileUpload: z.object({
    category: z.enum(['simja', 'sika', 'hsse_pass', 'worker_photo', 'id_card', 'other']),
    filename: z.string().min(1).max(255),
  }),
  
  // Worker photo upload
  workerPhoto: z.object({
    submissionId: z.string().cuid(),
    workerId: z.string().cuid().optional(),
    workerName: z.string().min(2).max(100).optional(),
  }),
};

/**
 * Auth schemas
 */
export const AuthSchemas = {
  // Signup (vendor registration)
  signup: z.object({
    officer_name: z.string()
      .min(2, 'Officer name must be at least 2 characters')
      .max(100, 'Officer name must be at most 100 characters')
      .trim(),
    email: CommonSchemas.email,
    password: CommonSchemas.password,
    vendor_name: z.string()
      .min(2, 'Vendor name must be at least 2 characters')
      .max(150, 'Vendor name must be at most 150 characters')
      .trim(),
    address: z.string()
      .min(10, 'Address must be at least 10 characters')
      .max(500, 'Address must be at most 500 characters')
      .trim(),
    phone_number: CommonSchemas.phoneNumber,
    turnstile_token: z.string().min(1, 'Security token is required'),
  }),
  
  // Login
  login: z.object({
    email: CommonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),
};

/**
 * Notification schemas
 */
export const NotificationSchemas = {
  // Query notifications
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    filter: z.enum(['all', 'unread', 'read']).default('all'),
  }),
  
  // Mark as read
  markRead: z.object({
    id: z.string().cuid(),
  }),
};

/**
 * Type exports for TypeScript
 */
export type QrVerifyInput = z.infer<typeof QrSchemas.qrVerify>;
export type CreateSubmissionInput = z.infer<typeof SubmissionSchemas.create>;
export type UpdateSubmissionInput = z.infer<typeof SubmissionSchemas.update>;
export type ReviewSubmissionInput = z.infer<typeof SubmissionSchemas.review>;
export type ApproveSubmissionInput = z.infer<typeof SubmissionSchemas.approve>;
export type CreateUserInput = z.infer<typeof UserSchemas.create>;
export type UpdateUserInput = z.infer<typeof UserSchemas.update>;
export type VerifyUserInput = z.infer<typeof UserSchemas.verify>;
export type SignupInput = z.infer<typeof AuthSchemas.signup>;
export type ChangePasswordInput = z.infer<typeof UserSchemas.changePassword>;
