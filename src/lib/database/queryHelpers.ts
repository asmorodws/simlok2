/**
 * Query Optimization Helpers
 * 
 * Reusable database query patterns and optimizations
 * to reduce code duplication and improve performance.
 */

import { Prisma } from '@prisma/client';

/**
 * Standard ordering configuration for submissions
 */
export const submissionOrderByMap: Record<string, Prisma.SubmissionOrderByWithRelationInput> = {
  created_at: { created_at: 'desc' },
  vendor_name: { vendor_name: 'asc' },
  simlok_number: { simlok_number: 'asc' },
  review_status: { review_status: 'asc' },
  approval_status: { approval_status: 'asc' },
};

/**
 * Standard ordering configuration for users
 */
export const userOrderByMap: Record<string, Prisma.UserOrderByWithRelationInput> = {
  created_at: { created_at: 'desc' },
  officer_name: { officer_name: 'asc' },
  vendor_name: { vendor_name: 'asc' },
  email: { email: 'asc' },
  role: { role: 'asc' },
  verification_status: { verification_status: 'asc' },
};

/**
 * Get safe order by configuration
 * Falls back to default if invalid sortBy is provided
 */
export function getSafeOrderBy<T>(
  sortBy: string,
  sortOrder: 'asc' | 'desc',
  orderByMap: Record<string, any>,
  defaultSort = 'created_at'
): T {
  const field = orderByMap[sortBy] ? sortBy : defaultSort;
  const order = orderByMap[field];
  
  // If it's a simple field, apply sort order
  if (typeof order === 'object' && order !== null) {
    const keys = Object.keys(order);
    if (keys.length > 0) {
      const key = keys[0] as string;
      const result: Record<string, any> = {};
      result[key] = sortOrder;
      return result as T;
    }
  }
  
  return order as T;
}

/**
 * Common Prisma select fields for submissions (reduces query size)
 */
export const submissionSelectFields: Prisma.SubmissionSelect = {
  id: true,
  simlok_number: true,
  vendor_name: true,
  officer_name: true,
  job_description: true,
  work_location: true,
  working_hours: true,
  worker_count: true,
  implementation_start_date: true,
  implementation_end_date: true,
  implementation: true,
  based_on: true,
  review_status: true,
  approval_status: true,
  qrcode: true,
  created_at: true,
  reviewed_at: true,
  approved_at: true,
  user_id: true,
  user_email: true,
  user_phone_number: true,
  user_address: true,
  user_vendor_name: true,
  user_officer_name: true,
};

/**
 * Minimal submission fields for list views
 */
export const submissionSelectMinimal: Prisma.SubmissionSelect = {
  id: true,
  simlok_number: true,
  vendor_name: true,
  work_location: true,
  worker_count: true,
  review_status: true,
  approval_status: true,
  created_at: true,
};

/**
 * Common user select fields (excludes password)
 */
export const userSelectFields: Prisma.UserSelect = {
  id: true,
  email: true,
  officer_name: true,
  vendor_name: true,
  phone_number: true,
  address: true,
  role: true,
  verification_status: true,
  rejection_reason: true,
  created_at: true,
  verified_at: true,
  rejected_at: true,
  password: false, // Explicitly exclude password
};

/**
 * Build search conditions for submissions
 * Optimized OR query for full-text search
 */
export function buildSubmissionSearchConditions(search: string): Prisma.SubmissionWhereInput {
  const searchConditions = {
    OR: [
      { simlok_number: { contains: search } },
      { vendor_name: { contains: search } },
      { officer_name: { contains: search } },
      { work_location: { contains: search } },
      { job_description: { contains: search } },
    ]
  };
  return searchConditions;
}

/**
 * Build search conditions for users
 */
export function buildUserSearchConditions(search: string): Prisma.UserWhereInput {
  return {
    OR: [
      { officer_name: { contains: search } },
      { vendor_name: { contains: search } },
      { email: { contains: search } },
    ]
  };
}

/**
 * Build date range filter for submissions
 */
export function buildDateRangeFilter(
  dateFrom?: string | null,
  dateTo?: string | null,
  field: 'created_at' | 'updated_at' | 'reviewed_at' | 'approved_at' = 'created_at'
): Prisma.SubmissionWhereInput | Record<string, never> {
  if (!dateFrom && !dateTo) return {};

  const dateFilter: any = {};
  
  if (dateFrom) {
    dateFilter.gte = new Date(dateFrom);
  }
  
  if (dateTo) {
    // Include the entire day
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);
    dateFilter.lte = endDate;
  }

  return { [field]: dateFilter };
}

/**
 * Combine multiple where clauses efficiently
 */
export function combineWhereConditions(
  ...conditions: (Prisma.SubmissionWhereInput | Prisma.UserWhereInput | Record<string, never>)[]
): any {
  const validConditions = conditions.filter(c => Object.keys(c).length > 0);
  
  if (validConditions.length === 0) return {};
  if (validConditions.length === 1) return validConditions[0];
  
  return { AND: validConditions };
}

/**
 * Parallel count and find for better performance
 * Execute count and findMany queries in parallel using Promise.all
 * 
 * @example
 * ```typescript
 * const [items, total] = await parallelCountAndFind(
 *   prisma.submission,
 *   where,
 *   { skip, take: limit, orderBy }
 * );
 * ```
 */
export async function parallelCountAndFind<T>(
  model: any,
  where: any,
  findOptions: {
    skip?: number;
    take?: number;
    orderBy?: any;
    include?: any;
    select?: any;
  }
): Promise<[T[], number]> {
  const [items, total] = await Promise.all([
    model.findMany({
      where,
      ...findOptions,
    }),
    model.count({ where }),
  ]);

  return [items, total];
}

/**
 * Check if value is valid CUID
 */
export function isValidCuid(value: string): boolean {
  // CUID format: starts with 'c', followed by timestamp and random chars
  // Length is typically 25 characters
  return /^c[0-9a-z]{24}$/.test(value);
}

/**
 * Sanitize string for SQL LIKE queries (prevent injection)
 */
export function sanitizeSearchTerm(term: string): string {
  // Escape special characters that have meaning in LIKE queries
  return term.replace(/[%_\\]/g, '\\$&').trim();
}

/**
 * Build role-based where clause for users
 */
export function buildUserRoleFilter(
  currentUserRole: string,
  requestedRole?: string | null
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  if (currentUserRole === 'REVIEWER') {
    // Reviewers only see vendor users
    where.role = 'VENDOR';
  } else if (currentUserRole === 'ADMIN') {
    // Admins can't see super admins
    where.NOT = { role: 'SUPER_ADMIN' };
    
    // Apply role filter if specified
    if (requestedRole && requestedRole !== 'SUPER_ADMIN') {
      where.role = requestedRole as any;
    }
  } else if (currentUserRole === 'SUPER_ADMIN') {
    // Super admins see all, but can filter by role
    if (requestedRole) {
      where.role = requestedRole as any;
    }
  }

  return where;
}

/**
 * Build role-based where clause for submissions
 */
export function buildSubmissionRoleFilter(
  currentUserRole: string,
  currentUserId: string
): Prisma.SubmissionWhereInput {
  const where: Prisma.SubmissionWhereInput = {};

  switch (currentUserRole) {
    case 'VENDOR':
      // Vendors only see their own submissions
      where.user_id = currentUserId;
      break;
      
    case 'REVIEWER':
      // Reviewers see submissions that need review or are being reviewed
      where.OR = [
        { review_status: 'PENDING_REVIEW' },
        { review_status: 'MEETS_REQUIREMENTS' },
        { review_status: 'NOT_MEETS_REQUIREMENTS' },
      ];
      break;
      
    case 'APPROVER':
      // Approvers only see submissions that meet requirements
      where.review_status = 'MEETS_REQUIREMENTS';
      break;
      
    case 'VERIFIER':
      // Verifiers see approved submissions for scanning/verification
      where.approval_status = 'APPROVED';
      break;
      
    case 'ADMIN':
    case 'SUPER_ADMIN':
      // Admins see all submissions (no filter)
      break;
  }

  return where;
}

/**
 * Get statistics in parallel for dashboard
 * Optimized for dashboard stats queries
 */
export async function getSubmissionStats(
  prisma: any,
  where: Prisma.SubmissionWhereInput = {}
) {
  const [
    total,
    byReviewStatus,
    byApprovalStatus,
  ] = await Promise.all([
    prisma.submission.count({ where }),
    prisma.submission.groupBy({
      by: ['review_status'],
      where,
      _count: { id: true },
    }),
    prisma.submission.groupBy({
      by: ['approval_status'],
      where,
      _count: { id: true },
    }),
  ]);

  const reviewStats = byReviewStatus.reduce((acc: any, item: any) => {
    acc[item.review_status] = item._count.id;
    return acc;
  }, {});

  const approvalStats = byApprovalStatus.reduce((acc: any, item: any) => {
    acc[item.approval_status] = item._count.id;
    return acc;
  }, {});

  return {
    total,
    reviewStats,
    approvalStats,
  };
}
