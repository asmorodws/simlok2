# Component Folder Reorganization Plan

## Current Problems
- 72 directories with many duplicates (admin, approver, reviewer, vendor, verifier, visitor folders unused)
- Inconsistent naming (features, features-v2, common, shared)
- Mixed atomic design with feature-based approach
- Old backup files not cleaned

## New Structure (Clean & Scalable)

```
src/components/
├── ui/                           # Atomic/Primitive UI components (shadcn-style)
│   ├── button/
│   │   └── Button.tsx
│   ├── input/
│   │   ├── Input.tsx
│   │   ├── TextArea.tsx
│   │   ├── DatePicker.tsx
│   │   ├── DateRangePicker.tsx
│   │   ├── TimePicker.tsx
│   │   ├── TimeRangePicker.tsx
│   │   └── PhoneInput.tsx
│   ├── card/
│   │   ├── Card.tsx
│   │   ├── StatCard.tsx
│   │   ├── NoteCard.tsx
│   │   └── InfoCard.tsx
│   ├── badge/
│   │   ├── Badge.tsx
│   │   └── StatusBadge.tsx
│   ├── modal/
│   │   ├── Modal.tsx
│   │   ├── ConfirmModal.tsx
│   │   └── TermsModal.tsx
│   ├── table/
│   │   ├── Table.tsx
│   │   ├── TableActionButton.tsx
│   │   └── GenericDataTable.tsx
│   ├── alert/
│   │   └── Alert.tsx
│   ├── toast/
│   │   ├── Toast.tsx
│   │   └── ToastContainer.tsx
│   ├── loading/
│   │   ├── Skeleton.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── PageLoader.tsx
│   │   ├── TableSkeleton.tsx
│   │   └── PageSkeleton.tsx
│   ├── chart/
│   │   ├── BarChart.tsx
│   │   ├── PieChart.tsx
│   │   └── LineChart.tsx
│   ├── error/
│   │   └── ErrorBoundary.tsx
│   ├── form/
│   │   ├── Checkbox.tsx
│   │   ├── Label.tsx
│   │   └── GenericFilterBar.tsx
│   └── index.ts
│
├── layout/                       # Layout components
│   ├── SidebarLayout.tsx
│   ├── PageHeader.tsx
│   ├── RoleGate.tsx
│   └── index.ts
│
├── templates/                    # Page-level templates
│   ├── DashboardPageTemplate.tsx
│   ├── UserManagementPageTemplate.tsx
│   └── index.ts
│
├── features/                     # Feature-specific complex components
│   ├── auth/
│   │   ├── SignInForm.tsx
│   │   ├── SignUpForm.tsx
│   │   ├── AuthRedirect.tsx
│   │   └── index.ts
│   │
│   ├── user/
│   │   ├── UserTable.tsx
│   │   ├── UserFormModal.tsx
│   │   ├── UserVerificationModal.tsx
│   │   ├── DeleteUserModal.tsx
│   │   ├── AdminUserVerificationManagement.tsx
│   │   ├── ReviewerUserVerificationManagement.tsx
│   │   ├── UserInfoCard.tsx
│   │   ├── ChangePasswordCard.tsx
│   │   └── index.ts
│   │
│   ├── submission/
│   │   ├── SubmissionTable.tsx
│   │   ├── UnifiedSubmissionTable.tsx
│   │   ├── SubmissionFormShared.ts
│   │   ├── UnifiedSubmissionForm.tsx
│   │   ├── SubmissionDetailShared.tsx
│   │   ├── SubmissionsManagementShared.tsx
│   │   ├── RoleSubmissionsManagement.tsx
│   │   ├── VendorSubmissionsContent.tsx
│   │   ├── VendorSubmissionDetailModal.tsx
│   │   ├── ReviewerSubmissionDetailModal.tsx
│   │   ├── ApproverSubmissionDetailModal.tsx
│   │   ├── StatusCards.tsx
│   │   ├── TabNavigation.tsx
│   │   ├── SubmissionsCardView.tsx
│   │   ├── WorkersList.tsx
│   │   ├── SupportDocumentList.tsx
│   │   └── index.ts
│   │
│   ├── document/
│   │   ├── DocumentPreview.tsx
│   │   ├── DocumentPreviewModal.tsx
│   │   ├── SimlokPdfModal.tsx
│   │   ├── ExportFilterModal.tsx
│   │   ├── EnhancedFileUpload.tsx
│   │   ├── LegacyDocumentsSection.tsx
│   │   ├── SupportDocumentsSection.tsx
│   │   └── index.ts
│   │
│   ├── qr-scan/
│   │   ├── QRScanner.tsx
│   │   ├── CameraQRScanner.tsx
│   │   ├── ScanModal.tsx
│   │   ├── ScanDetailModal.tsx
│   │   ├── RoleScanDetailModal.tsx
│   │   ├── ScanHistoryTable.tsx
│   │   ├── ScanHistoryContent.tsx
│   │   ├── VerifierScanHistory.tsx
│   │   └── index.ts
│   │
│   ├── notification/
│   │   ├── NotificationsBell.tsx
│   │   ├── NotificationsPanel.tsx
│   │   └── index.ts
│   │
│   ├── dashboard/
│   │   ├── RoleDashboard.tsx
│   │   ├── DetailSection.tsx
│   │   └── index.ts
│   │
│   └── index.ts
│
├── shared/                       # Shared utilities and types
│   ├── types.ts
│   └── index.ts
│
└── index.ts                      # Barrel export for commonly used components
```

## Principles

1. **UI Components** - Pure, reusable, atomic components with no business logic
2. **Layout** - Page structure and navigation components
3. **Templates** - Page-level composition templates
4. **Features** - Business logic-heavy, feature-specific components
5. **Shared** - Common types and utilities

## Migration Strategy

### Phase 1: UI Components ✅
- Move all primitive components to ui/
- Consolidate duplicates (form/ → ui/form/)
- Remove empty folders

### Phase 2: Features ✅
- Flatten nested structures (user/management → user/)
- Consolidate by feature (submission/table + submission/modal → submission/)
- Remove scan/ → qr-scan/ for clarity

### Phase 3: Cleanup ✅
- Delete unused folders (admin, approver, reviewer, vendor, verifier, visitor, features-v2)
- Remove .BACKUP.tsx files
- Delete empty folders

### Phase 4: Update Imports ✅
- Update all import paths across the codebase
- Update barrel exports

### Phase 5: Verify ✅
- Run type checking
- Run build
- Test in browser

## Benefits

- **Clear hierarchy**: UI → Layout → Templates → Features
- **Easy to navigate**: Feature-based organization for complex components
- **Scalable**: Easy to add new features without cluttering
- **DRY**: No duplicate folders or components
- **Standards-compliant**: Follows React/Next.js best practices

## Estimated Impact
- Reduce from 72 directories to ~30 directories
- Remove 20+ duplicate/unused folders
- Cleaner imports (shorter paths)
- Better developer experience
