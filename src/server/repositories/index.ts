/**
 * Repositories Index - Centralized Data Access Layer Exports
 * 
 * Provides single import point for all repository instances.
 * Follows Repository pattern with consistent CRUD operations.
 */

// Repository Layer Exports
export { submissionRepository } from './submission/SubmissionRepository';
export { userRepository } from './user/UserRepository';
export { notificationRepository } from './notification/NotificationRepository';

// Base Repository Export for extension
export { BaseRepository } from './base/BaseRepository';

// Type Exports
export type {
  SubmissionFilters as RepoSubmissionFilters,
  PaginationParams,
  SubmissionWithUser,
  SubmissionStatistics
} from './submission/SubmissionRepository';

export type {
  UserStatistics,
  UserFilters
} from './user/UserRepository';

export type {
  NotificationWithReadStatus
} from './notification/NotificationRepository';

// Error Types
export {
  RepositoryError,
  NotFoundError,
  ConflictError
} from './base/BaseRepository';

/**
 * Repository Layer Architecture Notes:
 * 
 * 1. All repositories extend BaseRepository for consistent API
 * 2. Repositories encapsulate database-specific operations
 * 3. Complex queries are implemented as repository methods
 * 4. Repositories are stateless and can be safely cached
 * 5. Error handling uses domain-specific error types
 * 
 * Usage Example:
 * ```typescript
 * import { submissionRepository, userRepository } from '@/server/repositories';
 * 
 * // In service layer
 * const submission = await submissionRepository.findById(id);
 * const users = await userRepository.findByRole('VENDOR');
 * ```
 */