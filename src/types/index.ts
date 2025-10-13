/**
 * Central index file for all types
 * Import this file to get access to all types
 */

// Common types
export * from './common';

// User types
export * from './user';

// Submission types
export * from './submission';

// Store types
export * from './store';

// Notification types
export * from './notification';

// Image types
export * from './image';

// Re-export frequently used Prisma types
export type {
  User_role,
  ApprovalStatus,
  ReviewStatus,
  VerificationStatus,
  NotificationScope
} from '@prisma/client';