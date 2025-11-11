/**
 * Service Result Types
 * Standardized response format for service layer operations
 * Provides type-safe, consistent result handling across all services
 */

// ==================== CORE RESULT TYPES ====================

/**
 * Success result from service operation
 */
export interface ServiceSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string | undefined;
  metadata?: ServiceMetadata | undefined;
}

/**
 * Error result from service operation
 */
export interface ServiceError {
  success: false;
  error: string;
  message: string;
  code?: string | undefined;
  context?: Record<string, any> | undefined;
}

/**
 * Service result - either success or error
 */
export type ServiceResult<T = unknown> = ServiceSuccess<T> | ServiceError;

/**
 * Metadata that can be attached to service results
 */
export interface ServiceMetadata {
  /** Pagination information */
  pagination?: PaginationMetadata | undefined;
  /** Additional custom metadata */
  [key: string]: any;
}

/**
 * Pagination metadata
 */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Create a success result
 */
export function success<T>(data: T, message?: string, metadata?: ServiceMetadata): ServiceSuccess<T> {
  const result: ServiceSuccess<T> = {
    success: true,
    data,
  };

  if (message) {
    result.message = message;
  }

  if (metadata) {
    result.metadata = metadata;
  }

  return result;
}

/**
 * Create an error result
 */
export function error(
  message: string,
  errorName: string = 'Error',
  code?: string,
  context?: Record<string, any>
): ServiceError {
  const result: ServiceError = {
    success: false,
    error: errorName,
    message,
  };

  if (code) {
    result.code = code;
  }

  if (context) {
    result.context = context;
  }

  return result;
}

/**
 * Create pagination metadata
 */
export function createPaginationMetadata(
  page: number,
  limit: number,
  total: number
): PaginationMetadata {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Create success result with pagination
 */
export function successWithPagination<T>(
  data: T,
  page: number,
  limit: number,
  total: number,
  message?: string
): ServiceSuccess<T> {
  return success(data, message, {
    pagination: createPaginationMetadata(page, limit, total),
  });
}

// ==================== TYPE GUARDS ====================

/**
 * Check if result is a success
 */
export function isSuccess<T>(result: ServiceResult<T>): result is ServiceSuccess<T> {
  return result.success === true;
}

/**
 * Check if result is an error
 */
export function isError<T>(result: ServiceResult<T>): result is ServiceError {
  return result.success === false;
}

// ==================== RESULT TRANSFORMERS ====================

/**
 * Map success result to a new type
 */
export function mapSuccess<T, U>(
  result: ServiceResult<T>,
  mapper: (data: T) => U
): ServiceResult<U> {
  if (isSuccess(result)) {
    return {
      ...result,
      data: mapper(result.data),
    };
  }
  return result;
}

/**
 * Unwrap result or throw error
 * Useful when you want to convert ServiceResult to promise-based error handling
 */
export function unwrap<T>(result: ServiceResult<T>): T {
  if (isSuccess(result)) {
    return result.data;
  }
  throw new Error(result.message);
}

/**
 * Unwrap result or return default value
 */
export function unwrapOr<T>(result: ServiceResult<T>, defaultValue: T): T {
  if (isSuccess(result)) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Get error message from result
 */
export function getErrorMessage(result: ServiceResult): string | null {
  if (isError(result)) {
    return result.message;
  }
  return null;
}

/**
 * Get data from result or null
 */
export function getData<T>(result: ServiceResult<T>): T | null {
  if (isSuccess(result)) {
    return result.data;
  }
  return null;
}

// ==================== ASYNC RESULT UTILITIES ====================

/**
 * Wrap async function to return ServiceResult
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'Operation failed'
): Promise<ServiceResult<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : errorMessage;
    const errorName = err instanceof Error ? err.name : 'Error';
    return error(message, errorName);
  }
}

/**
 * Wrap sync function to return ServiceResult
 */
export function trySync<T>(
  fn: () => T,
  errorMessage: string = 'Operation failed'
): ServiceResult<T> {
  try {
    const data = fn();
    return success(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : errorMessage;
    const errorName = err instanceof Error ? err.name : 'Error';
    return error(message, errorName);
  }
}

// ==================== RESULT COMBINATORS ====================

/**
 * Combine multiple results - succeeds only if all succeed
 * Returns array of data if all succeed, or first error encountered
 */
export function combineResults<T>(results: ServiceResult<T>[]): ServiceResult<T[]> {
  const errors = results.filter(isError);
  
  if (errors.length > 0) {
    return errors[0] as ServiceError;
  }
  
  const data = results
    .filter(isSuccess)
    .map(r => r.data);
  
  return success(data);
}

/**
 * Execute async operations in sequence, stopping at first error
 */
export async function sequence<T>(
  operations: (() => Promise<ServiceResult<T>>)[]
): Promise<ServiceResult<T[]>> {
  const results: T[] = [];
  
  for (const operation of operations) {
    const result = await operation();
    
    if (isError(result)) {
      return result;
    }
    
    results.push(result.data);
  }
  
  return success(results);
}

/**
 * Execute async operations in parallel, collecting all results
 */
export async function parallel<T>(
  operations: (() => Promise<ServiceResult<T>>)[]
): Promise<ServiceResult<T[]>> {
  const results = await Promise.all(operations.map(op => op()));
  return combineResults(results);
}

// ==================== RESULT VALIDATION ====================

/**
 * Validate result and return new result with validation
 */
export function validate<T>(
  result: ServiceResult<T>,
  validator: (data: T) => boolean,
  errorMessage: string = 'Validation failed'
): ServiceResult<T> {
  if (isError(result)) {
    return result;
  }
  
  if (!validator(result.data)) {
    return error(errorMessage, 'ValidationError');
  }
  
  return result;
}

// ==================== COMMON RESULT PATTERNS ====================

/**
 * Create a not found error result
 */
export function notFound(resource: string = 'Resource'): ServiceError {
  return error(
    `${resource} tidak ditemukan`,
    'NotFoundError',
    'NOT_FOUND'
  );
}

/**
 * Create a duplicate error result
 */
export function duplicate(resource: string = 'Resource'): ServiceError {
  return error(
    `${resource} sudah ada`,
    'DuplicateError',
    'DUPLICATE'
  );
}

/**
 * Create an unauthorized error result
 */
export function unauthorized(message: string = 'Tidak memiliki akses'): ServiceError {
  return error(message, 'AuthorizationError', 'UNAUTHORIZED');
}

/**
 * Create a forbidden error result
 */
export function forbidden(message: string = 'Aksi tidak diizinkan'): ServiceError {
  return error(message, 'ForbiddenError', 'FORBIDDEN');
}

/**
 * Create a validation error result
 */
export function validationError(message: string, context?: Record<string, any>): ServiceError {
  return error(message, 'ValidationError', 'VALIDATION_ERROR', context);
}

// ==================== EXPORTS ====================

export default {
  // Creators
  success,
  error,
  successWithPagination,
  createPaginationMetadata,
  
  // Type Guards
  isSuccess,
  isError,
  
  // Transformers
  mapSuccess,
  unwrap,
  unwrapOr,
  getErrorMessage,
  getData,
  
  // Async Utilities
  tryAsync,
  trySync,
  
  // Combinators
  combineResults,
  sequence,
  parallel,
  
  // Validation
  validate,
  
  // Common Patterns
  notFound,
  duplicate,
  unauthorized,
  forbidden,
  validationError,
};
