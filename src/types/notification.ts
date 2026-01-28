/**
 * Notification related types and interfaces
 */

import { NotificationScope } from '@prisma/client';

/**
 * Notification interface for client-side usage
 */
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
  scope: string;
  vendorId?: string;
}

export interface NotificationData {
  id: string;
  scope: NotificationScope;
  vendor_id?: string | null;
  type: string;
  title: string;
  message: string;
  data?: any;
  created_at: Date;
  read?: boolean;
  read_at?: Date | null;
}

export interface NotificationRead {
  id: string;
  notification_id: string;
  user_id?: string | null;
  vendor_id?: string | null;
  read_at: Date;
}

export interface NotificationEventData {
  submissionId?: string;
  vendorId?: string;
  reviewerName?: string;
  approverName?: string;
  jobDescription?: string;
  reviewedBy?: string;
  reviewStatus?: string;
  reviewNote?: string;
  approvalStatus?: string;
  note?: string;
  vendorName?: string;
  officerName?: string;
  verificationStatus?: string;
  rejectionReason?: string;
}