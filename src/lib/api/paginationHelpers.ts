/**
 * Pagination Helper Functions
 * 
 * Centralized pagination utilities to standardize pagination
 * parsing and calculations across all API endpoints.
 */

/**
 * Pagination options for parsing query parameters
 */
export interface PaginationOptions {
  /** Default page number if not provided (default: 1) */
  defaultPage?: number;
  /** Default items per page if not provided (default: 10) */
  defaultLimit?: number;
  /** Maximum allowed items per page (default: 100) */
  maxLimit?: number;
  /** Minimum page number (default: 1) */
  minPage?: number;
}

/**
 * Parsed pagination parameters
 */
export interface ParsedPagination {
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  limit: number;
  /** Number of items to skip */
  skip: number;
  /** Sort field */
  sortBy: string;
  /** Sort direction */
  sortOrder: 'asc' | 'desc';
}

/**
 * Pagination metadata for API responses
 */
export interface PaginationMeta {
  /** Current page number */
  currentPage: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
}

/**
 * Parse pagination parameters from URL search params
 * 
 * @param searchParams - URLSearchParams object
 * @param options - Optional configuration
 * @returns Parsed pagination parameters
 * 
 * @example
 * ```typescript
 * const { searchParams } = new URL(request.url);
 * const { page, limit, skip, sortBy, sortOrder } = parsePagination(searchParams);
 * 
 * const items = await prisma.item.findMany({
 *   skip,
 *   take: limit,
 *   orderBy: { [sortBy]: sortOrder }
 * });
 * ```
 */
export function parsePagination(
  searchParams: URLSearchParams,
  options: PaginationOptions = {}
): ParsedPagination {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100,
    minPage = 1,
  } = options;

  // Parse page number with validation
  let page = parseInt(searchParams.get('page') || String(defaultPage), 10);
  if (isNaN(page) || page < minPage) {
    page = defaultPage;
  }

  // Parse limit with validation and max cap
  let limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);
  if (isNaN(limit) || limit < 1) {
    limit = defaultLimit;
  }
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  // Calculate skip
  const skip = (page - 1) * limit;

  // Parse sorting
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrderParam = searchParams.get('sortOrder')?.toLowerCase();
  const sortOrder: 'asc' | 'desc' = 
    sortOrderParam === 'asc' || sortOrderParam === 'desc' 
      ? sortOrderParam 
      : 'desc';

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
  };
}

/**
 * Create pagination metadata for API responses
 * 
 * @param page - Current page number
 * @param limit - Items per page
 * @param totalItems - Total number of items
 * @returns Pagination metadata
 * 
 * @example
 * ```typescript
 * const total = await prisma.item.count({ where });
 * const meta = createPaginationMeta(page, limit, total);
 * 
 * return NextResponse.json({
 *   success: true,
 *   data: items,
 *   pagination: meta
 * });
 * ```
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  return {
    currentPage: page,
    pageSize: limit,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  };
}

/**
 * Parse pagination and create Prisma query params in one call
 * 
 * @param searchParams - URLSearchParams object
 * @param options - Optional configuration
 * @returns Object with pagination values and Prisma-ready params
 * 
 * @example
 * ```typescript
 * const { page, limit, prismaParams } = parsePaginationWithPrismaParams(searchParams);
 * 
 * const [items, total] = await Promise.all([
 *   prisma.item.findMany({ ...prismaParams, where }),
 *   prisma.item.count({ where })
 * ]);
 * 
 * return NextResponse.json({
 *   success: true,
 *   data: items,
 *   pagination: createPaginationMeta(page, limit, total)
 * });
 * ```
 */
export function parsePaginationWithPrismaParams(
  searchParams: URLSearchParams,
  options: PaginationOptions = {}
) {
  const { page, limit, skip, sortBy, sortOrder } = parsePagination(searchParams, options);

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    prismaParams: {
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    },
  };
}

/**
 * Calculate offset for cursor-based pagination
 * 
 * @param cursor - Cursor value (usually ID of last item)
 * @param limit - Items per page
 * @returns Prisma cursor params
 */
export function createCursorPagination(
  cursor: string | null,
  limit: number
) {
  return cursor
    ? {
        take: limit,
        skip: 1, // Skip the cursor itself
        cursor: { id: cursor },
      }
    : {
        take: limit,
      };
}

/**
 * Validate page number
 */
export function isValidPage(page: number, minPage = 1, maxPage?: number): boolean {
  if (!Number.isInteger(page) || page < minPage) {
    return false;
  }
  if (maxPage !== undefined && page > maxPage) {
    return false;
  }
  return true;
}

/**
 * Validate limit/page size
 */
export function isValidLimit(limit: number, minLimit = 1, maxLimit = 100): boolean {
  return Number.isInteger(limit) && limit >= minLimit && limit <= maxLimit;
}

/**
 * Get page range for pagination UI
 * Useful for generating page numbers in pagination controls
 * 
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param maxVisible - Maximum number of page buttons to show (default: 5)
 * @returns Array of page numbers to display
 * 
 * @example
 * ```typescript
 * getPageRange(5, 10, 5) // Returns [3, 4, 5, 6, 7]
 * getPageRange(2, 10, 5) // Returns [1, 2, 3, 4, 5]
 * ```
 */
export function getPageRange(
  currentPage: number,
  totalPages: number,
  maxVisible = 5
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + maxVisible - 1);

  // Adjust start if we're near the end
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
