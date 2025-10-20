# Troubleshooting: PDF Document Display Errors

## Common Errors dan Solusi

### Error 1: "Failed to load PDF: Invalid PDF structure"

**Penyebab:**
- File PDF corrupt atau tidak valid
- PDF memiliki encryption yang tidak didukung
- File bukan PDF sungguhan (meskipun extension .pdf)

**Solusi:**
```bash
# Verifikasi file PDF valid
file public/uploads/{userId}/dokumen-hsse-pekerja/dokumen.pdf

# Output seharusnya: "PDF document, version X.X"
```

**Code Fix:**
```typescript
// Already implemented in imageLoader.ts:
const loadedPdf = await PDFDocument.load(pdfBytes, { 
  ignoreEncryption: true,    // ✅ Ignore encryption
  updateMetadata: false      // ✅ Don't update metadata
});
```

---

### Error 2: "PDF file not found"

**Penyebab:**
- File path tidak sesuai dengan struktur folder
- Kategori mapping salah
- File belum di-upload atau terhapus

**Debugging:**
```typescript
// Check logs untuk path resolution:
console.log('LoadWorkerDocument: Reading PDF from:', finalPath);

// Pastikan path seperti:
// /path/to/project/public/uploads/{userId}/dokumen-hsse-pekerja/file.pdf
```

**Solusi:**
1. Check folder structure:
```bash
ls -la public/uploads/{userId}/dokumen-hsse-pekerja/
```

2. Verify database URL:
```sql
SELECT id, worker_name, hsse_pass_document_upload 
FROM WorkerList 
WHERE hsse_pass_document_upload LIKE '%.pdf';
```

3. Check kategori mapping di `imageLoader.ts`:
```typescript
const categoryFolders: Record<string, string> = {
  'hsse-worker': 'dokumen-hsse-pekerja',  // ✅ Must match
  // ...
};
```

---

### Error 3: Emoji "" tidak tampil di PDF

**Penyebab:**
- StandardFonts di pdf-lib tidak support emoji
- Font encoding issue

**Solusi:**
✅ **Already fixed!** - Replaced emoji dengan text "PDF"

```typescript
// OLD (with emoji):
page.drawText("", { ... });  // ❌ Causes error

// NEW (without emoji):
page.drawText("PDF", {         // ✅ Works!
  size: 14,
  font: boldFont,
  color: rgb(0.2, 0.4, 0.8)
});
```

---

### Error 4: "Cannot read property 'getPageCount' of undefined"

**Penyebab:**
- `documentResult.pdfPages` is undefined
- PDF loading failed but type still set to 'pdf'

**Debugging:**
```typescript
console.log('Document result:', {
  type: documentResult.type,
  hasPdfPages: !!documentResult.pdfPages,
  error: documentResult.error
});
```

**Fix:**
```typescript
// Check both type AND pdfPages existence:
if (documentResult.type === 'pdf' && documentResult.pdfPages) {
  const pageCount = documentResult.pdfPages.getPageCount();
  // ...
}
```

---

### Error 5: Rectangle drawing fails

**Penyebab:**
- Invalid coordinates (negative values)
- Width/height is zero or negative
- Color values out of range (0-1)

**Check:**
```typescript
console.log('Rectangle params:', {
  x: documentX + 4,
  y: y - imageHeight + 4,
  width: itemWidth - 8,
  height: imageHeight - 28,
});

// Ensure all positive values:
// x >= 0, y >= 0, width > 0, height > 0
```

---

### Error 6: "Maximum call stack size exceeded"

**Penyebab:**
- Recursive loading (PDF references itself)
- Circular dependency in imports

**Solusi:**
- Ensure `loadWorkerDocument` tidak call dirinya sendiri
- Check import statements tidak circular

---

## Diagnostic Steps

### Step 1: Enable Verbose Logging

```typescript
// In imageLoader.ts, check all console.log are active:
console.log('LoadWorkerDocument: Loading document from path:', documentPath);
console.log('LoadWorkerDocument: Loading as PDF');
console.log('LoadWorkerDocument: Reading PDF from:', finalPath);
console.log('LoadWorkerDocument: PDF file read, size:', pdfBytes.length, 'bytes');
console.log('LoadWorkerDocument: Successfully loaded PDF with', pages, 'pages');
```

### Step 2: Test Individual File

```bash
# Run test script:
npx tsx scripts/test-pdf-document-loader.ts

# Output akan show:
# - File type detection
# - Path resolution
# - Loading result
# - Error details (if any)
```

### Step 3: Check File Permissions

```bash
# Ensure files readable:
chmod 644 public/uploads/{userId}/dokumen-hsse-pekerja/*.pdf

# Ensure directory accessible:
chmod 755 public/uploads/{userId}/dokumen-hsse-pekerja/
```

### Step 4: Validate PDF Structure

```bash
# Install pdfinfo:
sudo apt-get install poppler-utils

# Check PDF info:
pdfinfo public/uploads/{userId}/dokumen-hsse-pekerja/file.pdf

# Should show:
# - Page count
# - PDF version
# - File size
# - No encryption (or simple encryption)
```

### Step 5: Test with Sample PDF

```typescript
// Create minimal test PDF:
import { PDFDocument } from 'pdf-lib';

const testPdf = await PDFDocument.create();
testPdf.addPage([400, 600]);
const pdfBytes = await testPdf.save();

// Test loading:
const loaded = await PDFDocument.load(pdfBytes);
console.log('Test PDF loaded:', loaded.getPageCount(), 'pages'); // Should be 1
```

---

## Quick Fixes

### Reset Cache

If caching issue:
```typescript
import { clearImageCache } from '@/utils/pdf/imageLoader';

// Clear cache before generating PDF:
clearImageCache();
const pdfBytes = await generateSimlokPdf(data);
```

### Fallback to Placeholder

If loading consistently fails, update code to always show placeholder:
```typescript
if (documentResult.type === 'pdf') {
  // Always show placeholder instead of trying to embed
  drawPdfPlaceholder(page, documentX, y, itemWidth, imageHeight, font, boldFont);
}
```

### Skip PDF Workers

Temporary workaround - filter out PDF documents:
```typescript
const workersWithValidDocs = workers.filter(w => {
  const doc = w.hsse_pass_document_upload;
  return !doc || !doc.toLowerCase().endsWith('.pdf');
});
```

---

## Expected Behavior

### ✅ Successful PDF Loading

Console output:
```
LoadWorkerDocument: Loading document from path: /api/files/.../hsse-worker/Doc.pdf
LoadWorkerDocument: Loading as PDF
LoadWorkerDocument: Reading PDF from: /path/public/uploads/.../dokumen-hsse-pekerja/Doc.pdf
LoadWorkerDocument: PDF file read, size: 45678 bytes
LoadWorkerDocument: Successfully loaded PDF with 3 pages
Document result for Worker Name: pdf no error
```

PDF Display:
```
┌─────────────────┐
│   Light Blue    │
│      BG         │
│      PDF        │
│   Dokumen       │
│   3 halaman     │
│                 │
└─────────────────┘
```

### ✅ Fallback for Failed PDF

Console output:
```
LoadWorkerDocument: Failed to load PDF: Invalid PDF structure
Document result for Worker Name: unsupported Failed to load PDF: ...
```

PDF Display:
```
┌─────────────────┐
│                 │
│   Dokumen       │
│    error        │
│                 │
└─────────────────┘
```

---

## Contact/Support

If error persists after trying all solutions:

1. **Collect logs:**
   - Copy full console output
   - Note exact error message
   - Include file details (size, type, path)

2. **Check file:**
   - Can file be opened in PDF reader?
   - What's the file size?
   - Run `pdfinfo` output

3. **Verify environment:**
   - Node.js version
   - pdf-lib version
   - OS and filesystem type

4. **Provide minimal reproduction:**
   - Share anonymized PDF (if possible)
   - Code snippet that triggers error
   - Expected vs actual behavior

---

**Last Updated:** October 20, 2025
