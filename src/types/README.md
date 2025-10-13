# Types Architecture Documentation

## Overview
Semua types dan interfaces telah diorganisir dalam folder `/src/types` untuk meningkatkan maintainability dan reusability kode.

## Structure

```
src/types/
├── index.ts           # Central export file - import semua types dari sini
├── common.ts          # Types umum seperti Statistics, Pagination, ApiResponse
├── submission.ts      # Types terkait submission dan PDF
├── user.ts           # Types terkait user dan authentication
├── store.ts          # Types untuk Zustand stores
├── notification.ts   # Types untuk notifikasi
└── image.ts          # Types untuk image compression dan processing
```

## Usage

### Import Types
Gunakan central import untuk mengakses semua types:

```typescript
// ✅ Recommended - Central import
import { SubmissionData, UserData, Statistics } from '@/types';

// ❌ Avoid - Direct file imports (deprecated)
import { SubmissionData } from '@/types/submission';
import { UserData } from '@/types/user';
```

### Available Types

#### Common Types (`common.ts`)
- `Statistics` - Dashboard statistics interface
- `Pagination` - API pagination interface
- `ApiResponse<T>` - Standard API response wrapper
- `ApiListResponse<T>` - API response with pagination
- `UserReference` - Basic user reference for relations
- `RouteParams` - API route parameters
- `FileValidationOptions` & `FileValidationResult` - File validation
- `SearchFilters` - Search and filter options
- `SortOrder` - Sort order type

#### Submission Types (`submission.ts`)
- `SubmissionData` - Form submission data
- `SubmissionApprovalData` - Approval process data
- `SubmissionReviewData` - Review process data
- `Submission` - Complete submission interface for frontend
- `SubmissionPDFData` - PDF template data
- `WorkerList` - Worker list interface
- `QrScanData` - QR scan related data
- `SIMLOKOptions` - PDF generation options
- `SubmissionStatus` - Status type union

#### User Types (`user.ts`)
- `UserData` - Complete user data interface

#### Store Types (`store.ts`)
- `SubmissionStore` - Submission Zustand store interface
- `NotificationStore` - Notification store interface

#### Notification Types (`notification.ts`)
- `NotificationData` - Notification data interface
- `NotificationRead` - Notification read status
- `NotificationEventData` - Event data for notifications

#### Image Types (`image.ts`)
- `CompressionOptions` - Image compression options
- `CompressionResult` - Compression result data
- `ImageDimensions` - Image dimension interface

### Prisma Types Re-exports
Frequently used Prisma types are re-exported from the central index:

```typescript
import { 
  User_role, 
  ApprovalStatus, 
  ReviewStatus, 
  VerificationStatus, 
  NotificationScope 
} from '@/types';
```

## Migration Guide

### Before (Deprecated)
```typescript
// ❌ Local interface definitions (removed)
interface Submission {
  // ... local definition
}

// ❌ Direct type imports (deprecated)
import { SubmissionData } from '@/types/submission';
```

### After (Current)
```typescript
// ✅ Import from central types
import { Submission, SubmissionData } from '@/types';

// ✅ Use standardized interfaces
const submission: Submission = {
  // ... properly typed
};
```

## Benefits

1. **Single Source of Truth**: All types defined in one place
2. **No Duplication**: Eliminates duplicate interface definitions across files
3. **Easier Imports**: Single import statement for all types
4. **Better Maintainability**: Changes in one place reflect everywhere
5. **Type Safety**: Consistent typing across the entire application
6. **IntelliSense**: Better IDE support with centralized types

## Guidelines

1. **Always use central import**: `import { TypeName } from '@/types'`
2. **Don't create local interfaces**: Use existing types or extend them
3. **Update types centrally**: Modify types in `/src/types` folder only
4. **Follow naming conventions**: Use PascalCase for interfaces, camelCase for properties
5. **Add proper JSDoc**: Document complex types with comments
6. **Export from index.ts**: Always export new types from central index

## File Organization Rules

- **common.ts**: General-purpose types used across multiple modules
- **submission.ts**: Submission-specific types and related interfaces
- **user.ts**: User and authentication related types
- **store.ts**: Zustand store interfaces
- **notification.ts**: Notification system types
- **image.ts**: Image processing and validation types
- **index.ts**: Central export hub (never add types here directly)

This architecture ensures scalable, maintainable, and consistent type definitions across the entire SIMLOK application.