/**
 * Services Index - Centralized Service Layer Exports
 * 
 * Provides single import point for all business services.
 * Follows Clean Architecture principles with clear separation of concerns.
 */

// Service Layer Exports
export { dashboardService } from './dashboard/DashboardService';
export { submissionService } from './submission/SubmissionService';
export { authService } from './auth/AuthService';
export { cacheService } from './cache/CacheService';

// Type Exports for better developer experience
export type { 
  AdminDashboardStats,
  VendorDashboardStats, 
  ReviewerDashboardStats,
  ApproverDashboardStats 
} from './dashboard/DashboardService';

export type {
  CreateSubmissionData,
  ReviewSubmissionData,
  ApprovalData,
  SubmissionFilters
} from './submission/SubmissionService';

export type {
  RegisterUserData,
  ChangePasswordData
} from './auth/AuthService';

export type {
  CacheInvalidationEvent,
  CacheMetrics
} from './cache/CacheService';

/**
 * Service Layer Architecture Notes:
 * 
 * 1. All services are singleton instances for consistent state
 * 2. Services only depend on repository layer, never on presentation layer
 * 3. Business logic is encapsulated within service methods
 * 4. Services handle cache invalidation and event publishing
 * 5. Error handling follows domain-specific patterns
 * 
 * Usage Example:
 * ```typescript
 * import { dashboardService, submissionService } from '@/server/services';
 * 
 * // In API route handler
 * const stats = await dashboardService.getAdminStats();
 * const submissions = await submissionService.getSubmissionsPaginated(filters);
 * ```
 */