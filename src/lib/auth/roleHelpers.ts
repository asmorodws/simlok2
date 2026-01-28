/**
 * Role-based Access Control (RBAC) Helper Functions
 * 
 * Centralized role checking utilities to reduce code duplication
 * and improve maintainability across API endpoints.
 */

import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

/**
 * User role types in the system
 */
export type UserRole = 
  | 'VENDOR' 
  | 'VERIFIER' 
  | 'REVIEWER' 
  | 'APPROVER' 
  | 'ADMIN' 
  | 'SUPER_ADMIN';

/**
 * Pre-defined role groups for common access patterns
 */
export const RoleGroups = {
  /** Roles that can review submissions */
  REVIEWERS: ['REVIEWER', 'ADMIN', 'SUPER_ADMIN'] as const,
  
  /** Roles that can approve submissions */
  APPROVERS: ['APPROVER', 'ADMIN', 'SUPER_ADMIN'] as const,
  
  /** Roles that can verify QR codes and submissions */
  VERIFIERS: ['VERIFIER', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'] as const,
  
  /** Roles that can access scan history */
  SCAN_VIEWERS: ['REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'] as const,
  
  /** Roles that can manage users */
  USER_MANAGERS: ['REVIEWER', 'ADMIN', 'SUPER_ADMIN'] as const,
  
  /** Admin roles with elevated privileges */
  ADMINS: ['ADMIN', 'SUPER_ADMIN'] as const,
  
  /** Only super admin */
  SUPER_ADMINS: ['SUPER_ADMIN'] as const,
  
  /** All roles in the system */
  ALL: ['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'] as const,
} as const;

/**
 * Check if a user has one of the allowed roles
 * 
 * @param userRole - The user's current role
 * @param allowedRoles - Array of roles that are allowed
 * @returns true if user has one of the allowed roles
 * 
 * @example
 * ```typescript
 * if (hasRole(session.user.role, RoleGroups.REVIEWERS)) {
 *   // User is a reviewer, admin, or super admin
 * }
 * ```
 */
export function hasRole(
  userRole: string | undefined | null, 
  allowedRoles: readonly string[]
): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

/**
 * Check if user has any of multiple role groups (OR logic)
 * 
 * @param userRole - The user's current role
 * @param roleGroups - Multiple role groups to check
 * @returns true if user belongs to any of the role groups
 * 
 * @example
 * ```typescript
 * if (hasAnyRole(session.user.role, RoleGroups.REVIEWERS, RoleGroups.APPROVERS)) {
 *   // User is either a reviewer or approver (or admin/super admin)
 * }
 * ```
 */
export function hasAnyRole(
  userRole: string | undefined | null,
  ...roleGroups: readonly (readonly string[])[]
): boolean {
  if (!userRole) return false;
  return roleGroups.some(group => group.includes(userRole));
}

/**
 * Check if user has all specified roles (AND logic) - typically used for hierarchical checks
 * 
 * @param userRole - The user's current role
 * @param requiredRoles - All roles that must be satisfied
 * @returns true if user satisfies all role requirements
 */
export function hasAllRoles(
  userRole: string | undefined | null,
  ...requiredRoles: readonly (readonly string[])[]
): boolean {
  if (!userRole) return false;
  return requiredRoles.every(group => group.includes(userRole));
}

/**
 * Require specific role(s) or throw forbidden error
 * Throws an error if user doesn't have required role
 * 
 * @param userRole - The user's current role
 * @param allowedRoles - Array of roles that are allowed
 * @param customMessage - Optional custom error message
 * @throws {RoleError} If user doesn't have required role
 * 
 * @example
 * ```typescript
 * requireRole(session.user.role, RoleGroups.ADMINS, 'Only admins can perform this action');
 * ```
 */
export function requireRole(
  userRole: string | undefined | null,
  allowedRoles: readonly string[],
  customMessage?: string
): void {
  if (!hasRole(userRole, allowedRoles)) {
    const message = customMessage || `Access denied. Required roles: ${allowedRoles.join(', ')}`;
    throw new RoleError(message, allowedRoles as string[]);
  }
}

/**
 * Custom error class for role-based access violations
 */
export class RoleError extends Error {
  constructor(
    message: string,
    public readonly requiredRoles: string[]
  ) {
    super(message);
    this.name = 'RoleError';
  }
}

/**
 * Check if session exists and return user info, or return error response
 * 
 * @param session - NextAuth session object
 * @returns User info or NextResponse with 401 error
 * 
 * @example
 * ```typescript
 * const userOrError = requireSession(session);
 * if (userOrError instanceof NextResponse) return userOrError;
 * const user = userOrError;
 * ```
 */
export function requireSession(session: Session | null) {
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  return session.user;
}

/**
 * Require session and specific role in one call
 * Returns either the user object or an error response
 * 
 * @param session - NextAuth session object
 * @param allowedRoles - Array of allowed roles
 * @param customMessage - Optional custom forbidden message
 * @returns User object or NextResponse with error
 * 
 * @example
 * ```typescript
 * const userOrError = requireSessionWithRole(session, RoleGroups.ADMINS);
 * if (userOrError instanceof NextResponse) return userOrError;
 * const user = userOrError; // TypeScript knows this is a user
 * ```
 */
export function requireSessionWithRole(
  session: Session | null,
  allowedRoles: readonly string[],
  customMessage?: string
) {
  // First check session
  const userOrError = requireSession(session);
  if (userOrError instanceof NextResponse) {
    return userOrError;
  }

  // Then check role
  if (!hasRole(userOrError.role, allowedRoles)) {
    const message = customMessage || 
      `Access denied. Required roles: ${allowedRoles.join(', ')}`;
    return NextResponse.json(
      { success: false, error: message }, 
      { status: 403 }
    );
  }

  return userOrError;
}

/**
 * Create a standardized forbidden response
 * 
 * @param message - Optional custom message
 * @param allowedRoles - Roles that are allowed
 * @returns NextResponse with 403 status
 */
export function forbiddenResponse(
  message?: string,
  allowedRoles?: readonly string[]
) {
  const defaultMessage = allowedRoles 
    ? `Access denied. Required roles: ${allowedRoles.join(', ')}`
    : 'Access denied';
  
  return NextResponse.json(
    { success: false, error: message || defaultMessage }, 
    { status: 403 }
  );
}

/**
 * Create a standardized unauthorized response
 * 
 * @param message - Optional custom message
 * @returns NextResponse with 401 status
 */
export function unauthorizedResponse(message?: string) {
  return NextResponse.json(
    { success: false, error: message || 'Unauthorized' }, 
    { status: 401 }
  );
}

/**
 * Check if user is an admin (ADMIN or SUPER_ADMIN)
 */
export function isAdmin(userRole: string | undefined | null): boolean {
  return hasRole(userRole, RoleGroups.ADMINS);
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(userRole: string | undefined | null): boolean {
  return hasRole(userRole, RoleGroups.SUPER_ADMINS);
}

/**
 * Check if user is a vendor
 */
export function isVendor(userRole: string | undefined | null): boolean {
  return userRole === 'VENDOR';
}

/**
 * Get user role hierarchy level (higher number = more privileges)
 * Useful for comparisons
 */
export function getRoleLevel(userRole: string | undefined | null): number {
  const roleLevels: Record<string, number> = {
    'VENDOR': 1,
    'VERIFIER': 2,
    'REVIEWER': 3,
    'APPROVER': 3,
    'ADMIN': 4,
    'SUPER_ADMIN': 5,
  };
  return roleLevels[userRole || ''] || 0;
}

/**
 * Check if userRole has higher or equal privileges than compareRole
 */
export function hasHigherOrEqualRole(
  userRole: string | undefined | null,
  compareRole: string
): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(compareRole);
}
