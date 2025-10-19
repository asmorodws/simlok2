# Update Struktur Folder Upload

## Perubahan Struktur

### Struktur Lama (DEPRECATED)
```
/public/uploads/{userId}/
  ├── dokumen-sika/
  ├── dokumen-simja/
  ├── id-card/          ❌ DIHAPUS
  ├── lainnya/          ❌ DIHAPUS
  └── foto-pekerja/
```

### Struktur Baru (CURRENT)
```
/public/uploads/{userId}/
  ├── dokumen-sika/           # SIKA documents
  ├── dokumen-simja/          # SIMJA documents
  ├── dokumen-hsse/           # ✅ HSSE Pass submission-level
  ├── dokumen-hsse-pekerja/   # ✅ HSSE Pass worker-level
  ├── dokumen/                # ✅ Supporting documents
  └── foto-pekerja/           # Worker photos
```

## Mapping Kategori

### FileManager Categories
```typescript
type FileCategory = 
  | 'sika'        → 'dokumen-sika'
  | 'simja'       → 'dokumen-simja'
  | 'hsse'        → 'dokumen-hsse'
  | 'hsse-worker' → 'dokumen-hsse-pekerja'
  | 'document'    → 'dokumen'
  | 'worker-photo' → 'foto-pekerja'
```

### Field Name Detection
```typescript
// fileManager.getFileCategory() logic:
fieldName.includes('sika')                    → 'sika'
fieldName.includes('simja')                   → 'simja'
fieldName.includes('hsse_doc')                → 'hsse-worker'
fieldName.includes('hsse_pass_document_upload') → 'hsse'
fieldName.includes('hsse')                    → 'hsse'
fieldName.includes('worker_photo')            → 'worker-photo'
fieldName.includes('supporting')              → 'document'
default                                       → 'document'
```

## API Endpoints Updated

### 1. `/src/lib/fileManager.ts`
- ✅ Updated `getUserFolderStructure()` to return new folders
- ✅ Updated `FileInfo` interface category type
- ✅ Updated `getFileCategory()` to detect hsse-worker from field names
- ✅ All mapping objects updated to new structure

### 2. `/src/utils/pdf/imageLoader.ts`
- ✅ Updated `categoryFolders` mapping (line 220)
- ✅ Removed 'id-card' and 'other' categories
- ✅ Added 'hsse', 'hsse-worker', 'document' categories

### 3. `/src/app/api/files/[userId]/[category]/[filename]/route.ts`
- ✅ Updated `categoryFolders` mapping
- ✅ Added 'hsse-worker' category
- ✅ Removed 'other' category

## Form Field Mapping

### Submission Form Fields
```tsx
// Submission-level HSSE document
<EnhancedFileUpload
  name="hsse_pass_document_upload"  → category: 'hsse' → folder: 'dokumen-hsse'
/>

// Worker HSSE document
<EnhancedFileUpload
  name={`hsse_doc_${workerId}`}     → category: 'hsse-worker' → folder: 'dokumen-hsse-pekerja'
/>

// Worker photo
<EnhancedFileUpload
  name={`worker_photo_${workerId}`} → category: 'worker-photo' → folder: 'foto-pekerja'
  uploadType="worker-photo"
/>

// SIKA document
<EnhancedFileUpload
  name="sika_document_upload"       → category: 'sika' → folder: 'dokumen-sika'
/>

// SIMJA document
<EnhancedFileUpload
  name="simja_document_upload"      → category: 'simja' → folder: 'dokumen-simja'
/>

// Supporting documents
<EnhancedFileUpload
  name="supporting_document"        → category: 'document' → folder: 'dokumen'
/>
```

## Migration Steps (Manual)

Jika ada file di folder lama (`id-card/`, `lainnya/`), lakukan migrasi manual:

1. **Identifikasi file di folder lama:**
   ```bash
   ls public/uploads/*/id-card/
   ls public/uploads/*/lainnya/
   ```

2. **Pindahkan file sesuai jenis:**
   ```bash
   # Jika file adalah HSSE Pass pekerja
   mv public/uploads/{userId}/lainnya/Doc_*.pdf public/uploads/{userId}/dokumen-hsse-pekerja/
   
   # Jika file adalah dokumen pendukung lainnya
   mv public/uploads/{userId}/lainnya/*.pdf public/uploads/{userId}/dokumen/
   
   # Hapus folder lama setelah migrasi selesai
   rmdir public/uploads/{userId}/id-card
   rmdir public/uploads/{userId}/lainnya
   ```

3. **Update database URL jika diperlukan:**
   ```sql
   -- Update URL dari /api/files/{userId}/other/... ke /api/files/{userId}/hsse-worker/...
   UPDATE WorkerList 
   SET hsse_pass_document_upload = REPLACE(hsse_pass_document_upload, '/other/', '/hsse-worker/')
   WHERE hsse_pass_document_upload LIKE '%/other/%';
   
   -- Update URL dari /api/files/{userId}/id-card/... ke /api/files/{userId}/document/...
   UPDATE Submission
   SET ... -- sesuaikan dengan field yang menggunakan id-card category
   WHERE ... LIKE '%/id-card/%';
   ```

## Verification

Setelah update, verifikasi:

1. **Folder structure correct:**
   ```bash
   ls public/uploads/{userId}/
   # Should show: dokumen-sika, dokumen-simja, dokumen-hsse, dokumen-hsse-pekerja, dokumen, foto-pekerja
   ```

2. **No more old folders:**
   ```bash
   find public/uploads -type d -name "id-card" -o -name "lainnya"
   # Should return empty
   ```

3. **File upload works:**
   - Upload HSSE Pass submission document → saves to `dokumen-hsse/`
   - Upload worker HSSE document → saves to `dokumen-hsse-pekerja/`
   - Upload worker photo → saves to `foto-pekerja/`
   - Upload SIKA/SIMJA → saves to respective folders

4. **PDF generation works:**
   - Generate SIMLOK PDF with worker HSSE documents
   - No more "SOI not found in JPEG" errors
   - All images load correctly

## Breaking Changes

⚠️ **Important:** Files uploaded before this update may have incorrect paths. Run migration script to fix database URLs.

## Files Modified

1. `/src/lib/fileManager.ts` - Core file management
2. `/src/utils/pdf/imageLoader.ts` - PDF image loading
3. `/src/app/api/files/[userId]/[category]/[filename]/route.ts` - File serving API

## Testing Checklist

- [ ] Upload SIKA document → correct folder
- [ ] Upload SIMJA document → correct folder  
- [ ] Upload submission HSSE document → `dokumen-hsse/`
- [ ] Upload worker HSSE document → `dokumen-hsse-pekerja/`
- [ ] Upload worker photo → `foto-pekerja/`
- [ ] Generate PDF with all worker documents → no errors
- [ ] Old folders (`id-card`, `lainnya`) not created on new uploads
- [ ] File serving API returns correct files
- [ ] No TypeScript compilation errors
