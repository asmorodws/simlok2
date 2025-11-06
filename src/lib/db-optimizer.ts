/**
 * Database Query Optimizer
 * 
 * Best practices untuk optimasi query Prisma:
 * 1. Select only needed fields
 * 2. Use indexes effectively
 * 3. Batch operations
 * 4. Avoid N+1 queries
 */

// Standard user select (hanya field yang dibutuhkan)
export const userSelectMinimal = {
  id: true,
  officer_name: true,
  email: true,
  vendor_name: true,
} as const;

// Standard submission select untuk list view
export const submissionSelectList = {
  id: true,
  vendor_name: true,
  officer_name: true,
  job_description: true,
  work_location: true,
  working_hours: true,
  holiday_working_hours: true,
  approval_status: true,
  review_status: true,
  simlok_number: true,
  simlok_date: true,
  created_at: true,
  reviewed_at: true,
  approved_at: true,
  reviewed_by: true,
  approved_by: true,
  worker_count: true,
  implementation_start_date: true,
  implementation_end_date: true,
} as const;

// Full submission select untuk detail view
export const submissionSelectDetail = {
  // Include all fields from list
  ...submissionSelectList,
  // Additional detail fields
  based_on: true,
  implementation: true,
  work_facilities: true,
  worker_names: true,
  content: true,
  note_for_approver: true,
  note_for_vendor: true,
  qrcode: true,
  user_email: true,
  user_officer_name: true,
  user_vendor_name: true,
  user_phone_number: true,
  user_address: true,
  vendor_phone: true,
  signer_position: true,
  signer_name: true,
  user_id: true,
  approved_by_final_id: true,
} as const;

// Worker list select
export const workerListSelect = {
  id: true,
  worker_name: true,
  worker_photo: true,
  hsse_pass_number: true,
  hsse_pass_valid_thru: true,
  hsse_pass_document_upload: true,
  created_at: true,
} as const;

// Support document select
export const supportDocumentSelect = {
  id: true,
  document_type: true,
  document_subtype: true,
  document_number: true,
  document_date: true,
  document_upload: true,
  uploaded_at: true,
  uploaded_by: true,
} as const;

// Notification select
export const notificationSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  message: true,
  submissionId: true,
  isRead: true,
  createdAt: true,
  readAt: true,
} as const;

/**
 * Optimized include untuk submission list (minimal data)
 */
export const submissionIncludeList = {
  user: {
    select: userSelectMinimal,
  },
  // Don't include worker_list or support_documents in list view
} as const;

/**
 * Optimized include untuk submission detail (full data)
 */
export const submissionIncludeDetail = {
  user: {
    select: userSelectMinimal,
  },
  worker_list: {
    select: workerListSelect,
    orderBy: { created_at: 'asc' as const },
  },
  support_documents: {
    select: supportDocumentSelect,
    orderBy: { uploaded_at: 'desc' as const },
  },
} as const;

/**
 * Batch create helper
 */
export async function batchCreateWithRetry<T>(
  createFn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await createFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Batch create attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Parallel query helper dengan error handling
 */
export async function parallelQueries<T extends any[]>(
  queries: Array<() => Promise<any>>
): Promise<T> {
  try {
    return await Promise.all(queries.map(q => q())) as T;
  } catch (error) {
    console.error('Parallel queries failed:', error);
    throw error;
  }
}

/**
 * Pagination helper
 */
export function getPaginationParams(
  page: number = 1,
  limit: number = 10,
  maxLimit: number = 100
) {
  const safeLimit = Math.min(Math.max(limit, 1), maxLimit);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;
  
  return {
    skip,
    take: safeLimit,
    page: safePage,
    limit: safeLimit,
  };
}

/**
 * Build optimized where clause berdasarkan role
 */
export function buildRoleBasedWhereClause(
  role: string,
  userId: string,
  additionalFilters: any = {}
) {
  const whereClause: any = { ...additionalFilters };

  switch (role) {
    case 'VENDOR':
      whereClause.user_id = userId;
      break;
    
    case 'REVIEWER':
      if (!additionalFilters.review_status) {
        whereClause.review_status = { 
          in: ['PENDING_REVIEW', 'MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] 
        };
      }
      break;
      
    case 'APPROVER':
      if (!additionalFilters.review_status) {
        whereClause.review_status = { 
          in: ['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS'] 
        };
      }
      if (!additionalFilters.approval_status) {
        whereClause.approval_status = { 
          in: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'] 
        };
      }
      break;
      
    case 'VERIFIER':
      if (!additionalFilters.approval_status) {
        whereClause.approval_status = 'APPROVED';
      }
      break;
      
    case 'ADMIN':
    case 'SUPER_ADMIN':
      // No restrictions
      break;
      
    default:
      throw new Error('Invalid role');
  }

  return whereClause;
}
