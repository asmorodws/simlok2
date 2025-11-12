# File Upload Validation Implementation

## Overview
Comprehensive file validation system to prevent upload errors in submission forms. Implemented to catch issues before they cause problems during form submission or PDF generation.

## Implementation Date
January 2025

## Problem Solved
Users were experiencing errors during file uploads due to:
- Invalid file formats
- Corrupted files
- Files exceeding size limits
- Images with incorrect dimensions
- PDF files with structural issues
- HSSE worker documents uploaded as PDFs (should be images only)

## Solution Architecture

### 1. Validation Utility (`/src/utils/fileValidation.ts`)

**Purpose**: Centralized validation logic for all file uploads

**Key Features**:
- **Type-specific validators**: Different rules for worker photos, HSSE documents, PDFs, and general documents
- **Multi-layer validation**: File name, MIME type, size, structure, and dimensions
- **Warning system**: Non-critical issues generate warnings (e.g., large files) while critical issues fail validation
- **Detailed feedback**: Clear error messages in Indonesian with specific guidance

**Constants**:
```typescript
FILE_LIMITS = {
  MAX_IMAGE_SIZE: 8MB,
  MAX_PDF_SIZE: 10MB,
  RECOMMENDED_IMAGE_SIZE: 2MB,
  RECOMMENDED_PDF_SIZE: 5MB,
  MIN_IMAGE_WIDTH: 200px,
  MIN_IMAGE_HEIGHT: 200px,
  MAX_IMAGE_WIDTH: 4096px,
  MAX_IMAGE_HEIGHT: 4096px,
  MAX_FILENAME_LENGTH: 255 chars
}
```

**Validation Functions**:

1. **`validateWorkerPhoto(file)`**
   - Must be image (JPG, JPEG, PNG, WebP)
   - Size: Max 8MB, recommended < 2MB
   - Dimensions: Min 200x200px, max 4096x4096px
   - Async dimension checking
   - Warns if resolution is very high (will be compressed)

2. **`validateHSSEWorkerDocument(file)`**
   - **CRITICAL**: MUST be image (PDF explicitly rejected)
   - Same validation as worker photo
   - Special error message explaining PDF not allowed

3. **`validatePDFDocument(file)`**
   - Must be PDF
   - Size: Max 10MB, recommended < 5MB
   - PDF signature validation (%PDF- header check)
   - Structure integrity check

4. **`validateDocument(file)`**
   - Can be PDF or image
   - Type-specific size limits
   - Combined validation logic
   - Returns dimensions for images

5. **`validateMultipleFiles(files[])`**
   - Batch validation
   - Stops at first error
   - Aggregates warnings

**Helper Functions**:
- `getFileExtension(fileName)`: Extract file extension
- `formatFileSize(bytes)`: Human-readable size (e.g., "2.5 MB")
- `getFileInfo(file)`: Extract file metadata
- `validateFileName(fileName)`: Check for invalid characters, length
- `getImageDimensions(file)`: Async dimension extraction using Image API
- `validatePDFStructure(file)`: Check PDF signature via ArrayBuffer
- `buildSuccessResult()`: Helper to construct ValidationResult with optional warnings

**Return Type**:
```typescript
interface ValidationResult {
  isValid: boolean;
  error?: string;           // Critical error message
  warnings?: string[];      // Non-critical warnings
  details?: {               // File information
    name: string;
    size: number;
    type: string;
    extension: string;
    isImage: boolean;
    isPDF: boolean;
    dimensions?: { width: number; height: number };
  };
}
```

### 2. Enhanced File Upload Component (`/src/components/form/EnhancedFileUpload.tsx`)

**Changes Made**:

1. **Imports**: Added validation functions and warning icon
   ```tsx
   import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
   import {
     validateWorkerPhoto,
     validateHSSEWorkerDocument,
     validatePDFDocument,
     validateDocument,
   } from "@/utils/fileValidation";
   ```

2. **State Management**: Added warnings state
   ```tsx
   const [warnings, setWarnings] = useState<string[]>([]);
   ```

3. **Validation Logic**: Updated `validateFile()` to use new validators
   ```tsx
   const validateFile = async (file: File) => {
     switch (uploadType) {
       case "worker-photo": return await validateWorkerPhoto(file);
       case "document": return await validatePDFDocument(file);
       case "hsse-worker": return await validateHSSEWorkerDocument(file);
       case "other": return await validateDocument(file);
     }
   };
   ```

4. **File Selection Handler**: Shows warnings via toast and state
   ```tsx
   const validation = await validateFile(file);
   if (!validation.isValid) {
     setError(validation.error);
     showError("Validasi Gagal", validation.error);
     return;
   }
   if (validation.warnings?.length > 0) {
     setWarnings(validation.warnings);
     validation.warnings.forEach(w => showWarning("Perhatian", w));
   }
   ```

5. **UI Warning Display**: Added visual warning component
   ```tsx
   {warnings.length > 0 && !error && (
     <div className="mt-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
       <div className="flex items-start">
         <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
         <div className="ml-3">
           <p className="text-sm font-medium text-yellow-800">Perhatian:</p>
           <ul className="mt-1.5 space-y-1 text-xs text-yellow-700">
             {warnings.map((warning, idx) => (
               <li key={idx}>• {warning}</li>
             ))}
           </ul>
         </div>
       </div>
     </div>
   )}
   ```

6. **Cleanup**: Clear warnings on file remove
   ```tsx
   const handleRemove = () => {
     setWarnings([]);
     // ... other cleanup
   };
   ```

## Validation Rules Summary

| Upload Type | Formats | Max Size | Min Dimensions | Max Dimensions | Special Rules |
|-------------|---------|----------|----------------|----------------|---------------|
| Worker Photo | JPG, JPEG, PNG, WebP | 8MB | 200x200px | 4096x4096px | Warns if > 2MB or high resolution |
| HSSE Worker | JPG, JPEG, PNG (NO PDF!) | 8MB | 200x200px | 4096x4096px | **PDF explicitly rejected** |
| PDF Document | PDF only | 10MB | N/A | N/A | PDF signature check |
| General Document | PDF, JPG, JPEG, PNG | 10MB (PDF), 8MB (Image) | 200x200px (Image) | 4096x4096px (Image) | Type-specific validation |

## User Experience Flow

1. **File Selection**: User selects file via drag-drop or file picker
2. **Validation**: Async validation runs automatically
3. **Immediate Feedback**:
   - ❌ **Error**: File rejected, red error message shown
   - ⚠️ **Warning**: File accepted, yellow warning shown (toast + UI)
   - ✅ **Success**: File accepted, upload proceeds
4. **Visual Indicators**:
   - Toast notifications for instant feedback
   - Persistent warning display below file preview
   - Clear error messages with specific guidance
5. **File Upload**: Only valid files proceed to upload
6. **Cleanup**: Warnings cleared when file removed/replaced

## Error Messages (Indonesian)

All validation messages are in Indonesian for user clarity:

- **Invalid format**: "File harus berupa gambar (JPG, JPEG, PNG, atau WebP)"
- **HSSE PDF rejection**: "Dokumen HSSE pekerja HARUS berupa foto/gambar (JPG, JPEG, PNG). PDF tidak diperbolehkan."
- **File too large**: "Ukuran file terlalu besar (maksimal 8 MB)"
- **Low resolution**: "Resolusi gambar terlalu kecil (minimal 200x200px)"
- **Corrupted file**: "Gagal memuat gambar. File mungkin rusak atau format tidak didukung."
- **Invalid PDF**: "File PDF tidak valid atau rusak"
- **File name too long**: "Nama file terlalu panjang (maksimal 255 karakter)"
- **Invalid characters**: "Nama file mengandung karakter yang tidak diperbolehkan"

## Warning Messages (Indonesian)

Non-critical issues that don't prevent upload:

- "Ukuran file cukup besar (2.5 MB). Disarankan di bawah 2 MB"
- "Resolusi gambar sangat besar (4000x3000px). File akan dikompres."

## TypeScript Type Safety

All validation functions are fully typed with `exactOptionalPropertyTypes: true` compliance:

```typescript
interface ValidationResult {
  isValid: boolean;
  error?: string;      // Only present if validation fails
  warnings?: string[]; // Only present if warnings exist
  details?: {          // Only present if validation succeeds
    name: string;
    size: number;
    type: string;
    extension: string;
    isImage: boolean;
    isPDF: boolean;
    dimensions?: { width: number; height: number };
  };
}
```

Helper function ensures proper optional property handling:
```typescript
function buildSuccessResult(details, warnings) {
  const result = { isValid: true, details };
  if (warnings.length > 0) result.warnings = warnings;
  return result;
}
```

## Testing Scenarios

✅ **Valid Files**:
- Small JPG image (< 2MB)
- PDF document (< 5MB)
- PNG with correct dimensions

⚠️ **Warnings** (accepted with warning):
- Large image (3MB - accepted but warns)
- High resolution image (5000x4000px - accepted but warns)

❌ **Rejected Files**:
- PDF uploaded as HSSE worker document
- Image too small (100x100px)
- File too large (15MB)
- Corrupted image file
- PDF without valid signature
- File name with invalid characters (<>:"|?*)
- Empty file (0 bytes)

## Performance Considerations

1. **Async Validation**: All validation is async to prevent UI blocking
2. **Early Exit**: Validation stops at first critical error
3. **Image Loading**: Uses browser Image API (efficient)
4. **PDF Reading**: Only reads first 1024 bytes for signature check
5. **Dimension Caching**: Dimensions checked once per validation

## Integration Points

This validation system integrates with:
- ✅ **EnhancedFileUpload**: Main file upload component
- ✅ **SubmissionForm**: Worker photos and HSSE documents
- ✅ **Toast Notifications**: Immediate user feedback
- ⏳ **Future**: Can be extended to other upload components

## Benefits

1. **Prevention**: Catches errors before upload/submission
2. **User Guidance**: Clear, actionable error messages
3. **Data Quality**: Ensures files meet requirements for PDF generation
4. **Performance**: Early validation prevents server-side errors
5. **Consistency**: Centralized validation logic
6. **Type Safety**: Full TypeScript type checking
7. **Maintainability**: Single source of truth for validation rules
8. **User Experience**: Warnings allow users to proceed with non-critical issues

## Future Enhancements

Potential improvements:
- [ ] Add unit tests for validation functions
- [ ] Implement file preview with dimensions display
- [ ] Add file format conversion suggestions
- [ ] Implement batch file validation progress
- [ ] Add validation metrics/logging
- [ ] Create admin config for file size limits
- [ ] Add file compression preview before upload
- [ ] Implement drag-drop validation feedback

## Related Documentation

- `OPTIMASI_FILE_PREVIEW.md`: File preview optimization
- `OPTIMASI_UPLOAD_API_PERFORMANCE.md`: Upload API performance
- `FILE_COMPRESSION_LIMITATIONS.md`: PDF compression issues
- `FIX_DUPLICATE_SUBMISSION_PREVENTION.md`: Submission validation

## Conclusion

The file upload validation system provides comprehensive, user-friendly validation with clear feedback. It prevents common upload errors, improves data quality, and enhances the overall user experience. All validation messages are in Indonesian, ensuring accessibility for the target user base.

**Status**: ✅ Complete and deployed (January 2025)
**TypeScript Errors**: ✅ 0 errors
**Test Coverage**: ⏳ Pending
**User Testing**: ⏳ Pending
