// New Unified Modal (replaces 3 old DetailModals)
export { default as UnifiedSubmissionDetailModal } from './UnifiedSubmissionDetailModal';

export { default as RoleSubmissionsManagement } from './management/RoleSubmissionsManagement';
export { default as StatusCards } from './StatusCards';

// Export only the functions and badge components from SubmissionDetailShared
export { 
  formatDate,
  formatWorkLocation,
  generateSimlokNumber,
  parseSimlokDate,
  ApprovalStatusBadge as DetailApprovalStatusBadge,
  ReviewStatusBadge as DetailReviewStatusBadge,
} from './SubmissionDetailShared';

// Export from SubmissionTableShared
export {
  ApprovalStatusBadge as TableApprovalStatusBadge,
  ReviewStatusBadge as TableReviewStatusBadge,
} from './SubmissionTableShared';

// Export types and functions from SubmissionFormShared
export * from './SubmissionFormShared';

// Export from SubmissionTable
export * from './SubmissionTable';

export { default as SubmissionsCardView } from './SubmissionsCardView';
export * from './SubmissionsManagementShared';
export { default as SupportDocumentList } from './SupportDocumentList';
export { default as TabNavigation } from './TabNavigation';
export { default as UnifiedSubmissionForm } from './UnifiedSubmissionForm';
export { default as UnifiedSubmissionTable } from './UnifiedSubmissionTable';
export { default as VendorSubmissionsContent } from './VendorSubmissionsContent';
export { default as WorkersList } from './WorkersList';
