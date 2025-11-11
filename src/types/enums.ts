/**
 * Centralized Enums for SIMLOK Application
 * 
 * This file contains all enum definitions used throughout the application.
 * Keeping enums centralized ensures consistency and makes it easier to maintain.
 * 
 * @module types/enums
 */

// ==================== USER ROLES ====================

/**
 * User roles in the system
 * Defines the access level and permissions for different user types
 */
export enum UserRole {
  /** Vendor who creates submissions */
  VENDOR = 'VENDOR',
  
  /** Reviews submissions before approval */
  REVIEWER = 'REVIEWER',
  
  /** Approves or rejects reviewed submissions */
  APPROVER = 'APPROVER',
  
  /** Verifies and scans QR codes */
  VERIFIER = 'VERIFIER',
  
  /** Super administrator with full access */
  SUPER_ADMIN = 'SUPER_ADMIN',
  
  /** Read-only visitor access */
  VISITOR = 'VISITOR',
}

/**
 * Type guard to check if a value is a valid UserRole
 */
export function isUserRole(value: any): value is UserRole {
  return Object.values(UserRole).includes(value);
}

/**
 * Get user role display name
 */
export function getUserRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    [UserRole.VENDOR]: 'Vendor',
    [UserRole.REVIEWER]: 'Reviewer',
    [UserRole.APPROVER]: 'Approver',
    [UserRole.VERIFIER]: 'Verifier',
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.VISITOR]: 'Visitor',
  };
  return labels[role];
}

// ==================== VERIFICATION STATUS ====================

/**
 * User verification status
 * Tracks the verification state of new user registrations
 */
export enum VerificationStatus {
  /** Awaiting verification */
  PENDING = 'PENDING',
  
  /** Verified and active */
  VERIFIED = 'VERIFIED',
  
  /** Rejected by reviewer */
  REJECTED = 'REJECTED',
}

/**
 * Get verification status label
 */
export function getVerificationStatusLabel(status: VerificationStatus): string {
  const labels: Record<VerificationStatus, string> = {
    [VerificationStatus.PENDING]: 'Pending Verification',
    [VerificationStatus.VERIFIED]: 'Verified',
    [VerificationStatus.REJECTED]: 'Rejected',
  };
  return labels[status];
}

/**
 * Get verification status color for UI
 */
export function getVerificationStatusColor(status: VerificationStatus): string {
  const colors: Record<VerificationStatus, string> = {
    [VerificationStatus.PENDING]: 'yellow',
    [VerificationStatus.VERIFIED]: 'green',
    [VerificationStatus.REJECTED]: 'red',
  };
  return colors[status];
}

// ==================== REVIEW STATUS ====================

/**
 * Submission review status
 * Tracks the reviewer's assessment of a submission
 */
export enum ReviewStatus {
  /** Awaiting review */
  PENDING_REVIEW = 'PENDING_REVIEW',
  
  /** Meets requirements, ready for approval */
  MEETS_REQUIREMENTS = 'MEETS_REQUIREMENTS',
  
  /** Does not meet requirements */
  NOT_MEETS_REQUIREMENTS = 'NOT_MEETS_REQUIREMENTS',
}

/**
 * Get review status label
 */
export function getReviewStatusLabel(status: ReviewStatus): string {
  const labels: Record<ReviewStatus, string> = {
    [ReviewStatus.PENDING_REVIEW]: 'Pending Review',
    [ReviewStatus.MEETS_REQUIREMENTS]: 'Meets Requirements',
    [ReviewStatus.NOT_MEETS_REQUIREMENTS]: 'Does Not Meet Requirements',
  };
  return labels[status];
}

/**
 * Get review status color for UI
 */
export function getReviewStatusColor(status: ReviewStatus): string {
  const colors: Record<ReviewStatus, string> = {
    [ReviewStatus.PENDING_REVIEW]: 'blue',
    [ReviewStatus.MEETS_REQUIREMENTS]: 'green',
    [ReviewStatus.NOT_MEETS_REQUIREMENTS]: 'red',
  };
  return colors[status];
}

// ==================== APPROVAL STATUS ====================

/**
 * Submission approval status
 * Tracks the approver's final decision on a submission
 */
export enum ApprovalStatus {
  /** Awaiting approval */
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  
  /** Approved by approver */
  APPROVED = 'APPROVED',
  
  /** Rejected by approver */
  REJECTED = 'REJECTED',
}

/**
 * Get approval status label
 */
export function getApprovalStatusLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    [ApprovalStatus.PENDING_APPROVAL]: 'Pending Approval',
    [ApprovalStatus.APPROVED]: 'Approved',
    [ApprovalStatus.REJECTED]: 'Rejected',
  };
  return labels[status];
}

/**
 * Get approval status color for UI
 */
export function getApprovalStatusColor(status: ApprovalStatus): string {
  const colors: Record<ApprovalStatus, string> = {
    [ApprovalStatus.PENDING_APPROVAL]: 'yellow',
    [ApprovalStatus.APPROVED]: 'green',
    [ApprovalStatus.REJECTED]: 'red',
  };
  return colors[status];
}

// ==================== NOTIFICATION SCOPE ====================

/**
 * Notification target scope
 * Defines who should receive specific notifications
 */
export enum NotificationScope {
  /** Notifications for admin users */
  ADMIN = 'admin',
  
  /** Notifications for vendors */
  VENDOR = 'vendor',
  
  /** Notifications for reviewers */
  REVIEWER = 'reviewer',
  
  /** Notifications for approvers */
  APPROVER = 'approver',
}

/**
 * Get notification scope label
 */
export function getNotificationScopeLabel(scope: NotificationScope): string {
  const labels: Record<NotificationScope, string> = {
    [NotificationScope.ADMIN]: 'Admin',
    [NotificationScope.VENDOR]: 'Vendor',
    [NotificationScope.REVIEWER]: 'Reviewer',
    [NotificationScope.APPROVER]: 'Approver',
  };
  return labels[scope];
}

// ==================== DOCUMENT TYPES ====================

/**
 * Support document types
 * Types of documents that can be attached to submissions
 */
export enum DocumentType {
  /** SIMJA document */
  SIMJA = 'SIMJA',
  
  /** SIKA document */
  SIKA = 'SIKA',
  
  /** Work Order document */
  WORK_ORDER = 'WORK_ORDER',
  
  /** Kontrak Kerja document */
  KONTRAK_KERJA = 'KONTRAK_KERJA',
  
  /** JSA document */
  JSA = 'JSA',
}

/**
 * Get document type label
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    [DocumentType.SIMJA]: 'SIMJA',
    [DocumentType.SIKA]: 'SIKA',
    [DocumentType.WORK_ORDER]: 'Work Order',
    [DocumentType.KONTRAK_KERJA]: 'Kontrak Kerja',
    [DocumentType.JSA]: 'JSA',
  };
  return labels[type];
}

// ==================== SUBMISSION WORKFLOW ====================

/**
 * Combined submission status for simplified UI display
 * This aggregates review and approval status
 */
export enum SubmissionWorkflowStatus {
  /** Initial state - awaiting review */
  PENDING_REVIEW = 'PENDING_REVIEW',
  
  /** Under review by reviewer */
  UNDER_REVIEW = 'UNDER_REVIEW',
  
  /** Review complete, awaiting approval */
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  
  /** Approved and ready */
  APPROVED = 'APPROVED',
  
  /** Rejected at any stage */
  REJECTED = 'REJECTED',
  
  /** QR code has been scanned */
  VERIFIED = 'VERIFIED',
}

/**
 * Get workflow status label
 */
export function getWorkflowStatusLabel(status: SubmissionWorkflowStatus): string {
  const labels: Record<SubmissionWorkflowStatus, string> = {
    [SubmissionWorkflowStatus.PENDING_REVIEW]: 'Pending Review',
    [SubmissionWorkflowStatus.UNDER_REVIEW]: 'Under Review',
    [SubmissionWorkflowStatus.PENDING_APPROVAL]: 'Pending Approval',
    [SubmissionWorkflowStatus.APPROVED]: 'Approved',
    [SubmissionWorkflowStatus.REJECTED]: 'Rejected',
    [SubmissionWorkflowStatus.VERIFIED]: 'Verified',
  };
  return labels[status];
}

/**
 * Get workflow status color for UI
 */
export function getWorkflowStatusColor(status: SubmissionWorkflowStatus): string {
  const colors: Record<SubmissionWorkflowStatus, string> = {
    [SubmissionWorkflowStatus.PENDING_REVIEW]: 'blue',
    [SubmissionWorkflowStatus.UNDER_REVIEW]: 'indigo',
    [SubmissionWorkflowStatus.PENDING_APPROVAL]: 'yellow',
    [SubmissionWorkflowStatus.APPROVED]: 'green',
    [SubmissionWorkflowStatus.REJECTED]: 'red',
    [SubmissionWorkflowStatus.VERIFIED]: 'purple',
  };
  return colors[status];
}

// ==================== LOG LEVELS ====================

/**
 * Logger severity levels
 */
export enum LogLevel {
  /** Informational messages */
  INFO = 'INFO',
  
  /** Warning messages */
  WARN = 'WARN',
  
  /** Error messages */
  ERROR = 'ERROR',
  
  /** Debug messages (development only) */
  DEBUG = 'DEBUG',
}

// ==================== SORT ORDERS ====================

/**
 * Sort order for list queries
 */
export enum SortOrder {
  /** Ascending order */
  ASC = 'asc',
  
  /** Descending order */
  DESC = 'desc',
}

// ==================== EXPORT FORMATS ====================

/**
 * Available export formats
 */
export enum ExportFormat {
  /** Excel format */
  XLSX = 'xlsx',
  
  /** CSV format */
  CSV = 'csv',
  
  /** PDF format */
  PDF = 'pdf',
}

// ==================== TYPE EXPORTS ====================

/**
 * Union type of all possible statuses
 */
export type AnyStatus = 
  | VerificationStatus 
  | ReviewStatus 
  | ApprovalStatus 
  | SubmissionWorkflowStatus;

/**
 * Union type of all user roles
 */
export type Role = UserRole;

/**
 * Constants for easy access
 */
export const ROLES = UserRole;
export const VERIFICATION_STATUS = VerificationStatus;
export const REVIEW_STATUS = ReviewStatus;
export const APPROVAL_STATUS = ApprovalStatus;
export const NOTIFICATION_SCOPE = NotificationScope;
export const DOCUMENT_TYPE = DocumentType;
export const WORKFLOW_STATUS = SubmissionWorkflowStatus;
export const LOG_LEVEL = LogLevel;
export const SORT_ORDER = SortOrder;
export const EXPORT_FORMAT = ExportFormat;

/**
 * Helper function to get status badge classes for Tailwind
 */
export function getStatusBadgeClasses(
  status: AnyStatus,
  size: 'sm' | 'md' | 'lg' = 'md'
): string {
  let colorClasses = '';
  
  // Determine color based on status type
  if (Object.values(VerificationStatus).includes(status as VerificationStatus)) {
    const color = getVerificationStatusColor(status as VerificationStatus);
    colorClasses = `bg-${color}-100 text-${color}-800 dark:bg-${color}-950 dark:text-${color}-400`;
  } else if (Object.values(ReviewStatus).includes(status as ReviewStatus)) {
    const color = getReviewStatusColor(status as ReviewStatus);
    colorClasses = `bg-${color}-100 text-${color}-800 dark:bg-${color}-950 dark:text-${color}-400`;
  } else if (Object.values(ApprovalStatus).includes(status as ApprovalStatus)) {
    const color = getApprovalStatusColor(status as ApprovalStatus);
    colorClasses = `bg-${color}-100 text-${color}-800 dark:bg-${color}-950 dark:text-${color}-400`;
  } else if (Object.values(SubmissionWorkflowStatus).includes(status as SubmissionWorkflowStatus)) {
    const color = getWorkflowStatusColor(status as SubmissionWorkflowStatus);
    colorClasses = `bg-${color}-100 text-${color}-800 dark:bg-${color}-950 dark:text-${color}-400`;
  }
  
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  
  return `inline-flex items-center font-medium rounded-full ${sizeClasses[size]} ${colorClasses}`;
}

/**
 * Get all status values for a specific status type
 */
export function getAllStatusValues<T extends AnyStatus>(
  statusEnum: { [key: string]: T }
): T[] {
  return Object.values(statusEnum);
}
