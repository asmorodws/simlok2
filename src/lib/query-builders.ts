/**
 * Prisma Query Builders
 * Reusable query building utilities for common Prisma patterns
 * Provides consistent pagination, filtering, sorting, and includes
 */

import { PAGINATION } from '@/config/constants';

// ==================== PAGINATION ====================

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number | undefined;
  limit?: number | undefined;
}

/**
 * Normalized pagination parameters
 */
export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Build pagination parameters
 * Normalizes and validates pagination options
 */
export function buildPagination(options?: PaginationOptions): NormalizedPagination {
  const page = Math.max(1, options?.page || PAGINATION.DEFAULT_PAGE);
  let limit = options?.limit || PAGINATION.DEFAULT_LIMIT;

  // Clamp limit within allowed range
  limit = Math.max(PAGINATION.MIN_LIMIT, Math.min(PAGINATION.MAX_LIMIT, limit));

  const skip = (page - 1) * limit;
  const take = limit;

  return {
    page,
    limit,
    skip,
    take,
  };
}

/**
 * Create paginated result
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  pagination: NormalizedPagination
): PaginatedResult<T> {
  const { page, limit } = pagination;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

// ==================== SORTING ====================

/**
 * Sort options
 */
export interface SortOptions {
  sortBy?: string | undefined;
  sortOrder?: 'asc' | 'desc' | undefined;
}

/**
 * Normalized sort parameters
 */
export interface NormalizedSort {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Build sort parameters
 * Validates sort field and order
 */
export function buildSort(
  options?: SortOptions,
  allowedFields: string[] = [],
  defaultField: string = 'created_at'
): NormalizedSort {
  const sortBy = options?.sortBy || defaultField;
  const sortOrder = options?.sortOrder === 'asc' ? 'asc' : 'desc';

  // Validate sort field if allowed fields provided
  const validSortBy =
    allowedFields.length === 0 || allowedFields.includes(sortBy)
      ? sortBy
      : defaultField;

  return {
    sortBy: validSortBy,
    sortOrder,
  };
}

/**
 * Create Prisma orderBy from sort options
 */
export function createOrderBy(sort: NormalizedSort): Record<string, 'asc' | 'desc'> {
  return {
    [sort.sortBy]: sort.sortOrder,
  };
}

// ==================== FILTERING ====================

/**
 * Search filter options
 */
export interface SearchOptions {
  search?: string | undefined;
  searchFields?: string[] | undefined;
}

/**
 * Build search filter
 * Creates OR condition for multiple fields
 */
export function buildSearchFilter(
  options: SearchOptions
): Record<string, any> | undefined {
  if (!options.search || !options.searchFields || options.searchFields.length === 0) {
    return undefined;
  }

  const search = options.search.trim();
  if (search.length === 0) {
    return undefined;
  }

  return {
    OR: options.searchFields.map((field) => ({
      [field]: {
        contains: search,
      },
    })),
  };
}

/**
 * Date range filter options
 */
export interface DateRangeOptions {
  startDate?: string | Date | undefined;
  endDate?: string | Date | undefined;
  dateField?: string | undefined;
}

/**
 * Build date range filter
 */
export function buildDateRangeFilter(
  options: DateRangeOptions
): Record<string, any> | undefined {
  const field = options.dateField || 'created_at';
  const hasStart = options.startDate !== undefined;
  const hasEnd = options.endDate !== undefined;

  if (!hasStart && !hasEnd) {
    return undefined;
  }

  const filter: Record<string, any> = {};

  if (hasStart && hasEnd) {
    filter[field] = {
      gte: new Date(options.startDate!),
      lte: new Date(options.endDate!),
    };
  } else if (hasStart) {
    filter[field] = {
      gte: new Date(options.startDate!),
    };
  } else if (hasEnd) {
    filter[field] = {
      lte: new Date(options.endDate!),
    };
  }

  return filter;
}

/**
 * Enum filter options
 */
export interface EnumFilterOptions {
  value?: string | string[] | undefined;
  field: string;
}

/**
 * Build enum filter (single or multiple values)
 */
export function buildEnumFilter(
  options: EnumFilterOptions
): Record<string, any> | undefined {
  if (!options.value) {
    return undefined;
  }

  if (Array.isArray(options.value)) {
    if (options.value.length === 0) {
      return undefined;
    }
    
    return {
      [options.field]: {
        in: options.value,
      },
    };
  }

  return {
    [options.field]: options.value,
  };
}

/**
 * Combine multiple filters with AND
 */
export function combineFilters(
  ...filters: (Record<string, any> | undefined)[]
): Record<string, any> {
  const validFilters = filters.filter(
    (f): f is Record<string, any> => f !== undefined && Object.keys(f).length > 0
  );

  if (validFilters.length === 0) {
    return {};
  }

  if (validFilters.length === 1) {
    return validFilters[0]!; // Non-null assertion is safe here
  }

  return {
    AND: validFilters,
  };
}

// ==================== INCLUDES ====================

/**
 * Common include patterns for related models
 */
export const INCLUDES = {
  /**
   * Include user with basic fields
   */
  user: {
    select: {
      id: true,
      email: true,
      officer_name: true,
      vendor_name: true,
      role: true,
    },
  },

  /**
   * Include submission with basic fields
   */
  submission: {
    select: {
      id: true,
      vendor_name: true,
      work_location: true,
      review_status: true,
      approval_status: true,
      created_at: true,
    },
  },

  /**
   * Include support documents
   */
  supportDocuments: {
    select: {
      id: true,
      document_type: true,
      document_subtype: true,
      document_number: true,
      document_date: true,
      document_upload: true,
      uploaded_at: true,
    },
    orderBy: {
      uploaded_at: 'desc' as const,
    },
  },

  /**
   * Include worker list
   */
  workerList: {
    select: {
      id: true,
      worker_name: true,
      hsse_pass_number: true,
      hsse_pass_valid: true,
      created_at: true,
    },
    orderBy: {
      created_at: 'asc' as const,
    },
  },

  /**
   * Include notification with read status
   */
  notificationWithRead: (userId: string) => ({
    include: {
      notificationReads: {
        where: {
          user_id: userId,
        },
        select: {
          read_at: true,
        },
      },
    },
  }),
} as const;

// ==================== SELECT PATTERNS ====================

/**
 * Common select patterns to exclude sensitive fields
 */
export const SELECTS = {
  /**
   * User without password
   */
  userSafe: {
    id: true,
    email: true,
    officer_name: true,
    vendor_name: true,
    address: true,
    phone_number: true,
    role: true,
    profile_photo: true,
    created_at: true,
    verified_at: true,
    verification_status: true,
    isActive: true,
    rejected_at: true,
    rejection_reason: true,
    // Exclude: password_hash, created_by, updated_by, verified_by, rejected_by
  },

  /**
   * Submission summary (minimal fields)
   */
  submissionSummary: {
    id: true,
    vendor_name: true,
    work_location: true,
    job_description: true,
    review_status: true,
    approval_status: true,
    created_at: true,
    simlok_number: true,
    simlok_date: true,
  },
} as const;

// ==================== WHERE CLAUSE HELPERS ====================

/**
 * Build role-based where clause
 */
export function buildRoleFilter(
  role: string,
  userId: string
): Record<string, any> {
  switch (role) {
    case 'VENDOR':
      return { user_id: userId };
    case 'REVIEWER':
      return { review_status: { in: ['PENDING_REVIEW', 'NOT_MEETS_REQUIREMENTS'] } };
    case 'APPROVER':
      return {
        review_status: 'MEETS_REQUIREMENTS',
        approval_status: { in: ['PENDING_APPROVAL', 'REJECTED'] },
      };
    case 'VERIFIER':
      return { approval_status: 'APPROVED' };
    case 'SUPER_ADMIN':
    case 'VISITOR':
      return {}; // No filter - can see all
    default:
      return { user_id: userId }; // Default: own data only
  }
}

/**
 * Build active/deleted filter
 */
export function buildActiveFilter(includeDeleted: boolean = false): Record<string, any> {
  if (includeDeleted) {
    return {};
  }

  return {
    deleted_at: null,
  };
}

// ==================== QUERY BUILDER CLASS ====================

/**
 * Fluent query builder for complex Prisma queries
 */
export class QueryBuilder {
  private whereClause: Record<string, any> = {};
  private orderByClause: Record<string, 'asc' | 'desc'> = {};
  private includeClause: Record<string, any> = {};
  private selectClause: Record<string, boolean> = {};
  private paginationParams?: NormalizedPagination | undefined;

  where(filter: Record<string, any>): this {
    this.whereClause = combineFilters(this.whereClause, filter);
    return this;
  }

  orderBy(field: string, order: 'asc' | 'desc' = 'desc'): this {
    this.orderByClause = { [field]: order };
    return this;
  }

  include(includeConfig: Record<string, any>): this {
    this.includeClause = { ...this.includeClause, ...includeConfig };
    return this;
  }

  select(selectConfig: Record<string, boolean>): this {
    this.selectClause = { ...this.selectClause, ...selectConfig };
    return this;
  }

  paginate(options: PaginationOptions): this {
    this.paginationParams = buildPagination(options);
    return this;
  }

  build(): {
    where?: Record<string, any> | undefined;
    orderBy?: Record<string, 'asc' | 'desc'> | undefined;
    include?: Record<string, any> | undefined;
    select?: Record<string, boolean> | undefined;
    skip?: number | undefined;
    take?: number | undefined;
  } {
    const query: Record<string, any> = {};

    if (Object.keys(this.whereClause).length > 0) {
      query.where = this.whereClause;
    }

    if (Object.keys(this.orderByClause).length > 0) {
      query.orderBy = this.orderByClause;
    }

    if (Object.keys(this.includeClause).length > 0) {
      query.include = this.includeClause;
    }

    if (Object.keys(this.selectClause).length > 0) {
      query.select = this.selectClause;
    }

    if (this.paginationParams) {
      query.skip = this.paginationParams.skip;
      query.take = this.paginationParams.take;
    }

    return query;
  }
}

// ==================== EXPORTS ====================

export default {
  // Pagination
  buildPagination,
  createPaginatedResult,
  
  // Sorting
  buildSort,
  createOrderBy,
  
  // Filtering
  buildSearchFilter,
  buildDateRangeFilter,
  buildEnumFilter,
  combineFilters,
  buildRoleFilter,
  buildActiveFilter,
  
  // Includes & Selects
  INCLUDES,
  SELECTS,
  
  // Query Builder
  QueryBuilder,
};
