/**
 * Statistics related types
 */

export interface AdminStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalUsers: number;
  pendingUsers: number;
  totalVendors: number;
  totalVerifiers: number;
  pendingVerificationVendors: number;
  pendingVerificationSubmissions: number;
}

export interface VendorStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  draftSubmissions: number;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
}

export interface VerifierStats {
  totalScans: number;
  validScans: number;
  invalidScans: number;
  uniqueSubmissions: number;
}

export interface UserVerificationStats {
  pending: number;
  verified: number;
  rejected: number;
  total: number;
}

/**
 * Extended user verification stats for admin/reviewer dashboards
 */
export interface UserManagementStats {
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
  totalUsers: number;
  todayRegistrations: number;
}
