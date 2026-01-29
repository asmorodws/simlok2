// Unified exports
export { default as Spinner, LoadingOverlay, PageLoader, DashboardLoadingSkeleton } from './Spinner';
export { 
  default as Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonDashboardCard,
  SkeletonChart,
  SkeletonTable,
  SkeletonPage,
  ReviewerTableSkeleton,
  ApproverTableSkeleton
} from './Skeleton';

// Legacy exports for backward compatibility
export { default as LoadingSpinner } from './Spinner';
export { SkeletonPage as PageSkeleton } from './Skeleton';
export { SkeletonTable as TableSkeleton } from './Skeleton';
