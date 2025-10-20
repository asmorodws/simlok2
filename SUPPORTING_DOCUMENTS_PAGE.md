# Feature: Halaman Lampiran Dokumen Pendukung dalam PDF SIMLOK

**Date:** October 20, 2025  
**Feature:** Tambah halaman kedua di PDF untuk menampilkan dokumen SIMJA, SIKA, dan HSSE Pass sebelum daftar pekerja

---

## 📋 **Overview**

Sebelumnya, struktur PDF SIMLOK:
1. **Halaman 1:** Data SIMLOK utama
2. **Halaman 2+:** Daftar pekerja dengan foto dan dokumen HSSE

**Struktur Baru:**
1. **Halaman 1:** Data SIMLOK utama (tidak berubah)
2. **Halaman 2:** **LAMPIRAN DOKUMEN** - Menampilkan dokumen pendukung:
   - Dokumen SIMJA (jika ada)
   - Dokumen SIKA (jika ada)
   - Dokumen HSSE Pass (jika ada)
3. **Halaman 3+:** Daftar pekerja dengan foto dan dokumen HSSE

---

## 🎯 **Tujuan**

1. **Memudahkan Verifikasi:** Dokumen pendukung langsung terlihat di halaman kedua
2. **Organisasi Lebih Baik:** Pemisahan jelas antara dokumen perusahaan vs dokumen pekerja
3. **Kelengkapan Dokumen:** Semua dokumen penting ditampilkan dalam satu PDF
4. **Professional Layout:** Tampilan grid yang rapi dan terstruktur

---

## 🔧 **Implementasi**

### 1. **Update Type Definition**

**File:** `src/types/submission.ts`

```typescript
export interface SubmissionPDFData {
  // ... existing fields ...
  
  // Documents - ADDED fields for document uploads
  simja_number?: string | null;
  simja_date?: string | Date | null | undefined;
  simja_type?: string | null;
  simja_document_upload?: string | null;  // ✅ NEW
  
  sika_number?: string | null;
  sika_date?: string | Date | null | undefined;
  sika_type?: string | null;
  sika_document_upload?: string | null;   // ✅ NEW
  
  // HSSE Pass (already had document field)
  hsse_pass_number?: string | null;
  hsse_pass_valid_thru?: string | Date | null | undefined;
  hsse_pass_document_upload?: string | null;
}
```

### 2. **Add Supporting Documents Page Function**

**File:** `src/utils/pdf/simlokTemplate.ts`

**Fungsi Baru:** `addSupportingDocumentsPage()`

```typescript
/**
 * Add page with supporting documents (SIMJA, SIKA, HSSE Pass)
 * Documents are displayed in a grid layout: 2 columns x 2 rows
 */
async function addSupportingDocumentsPage(
  k: PDFKit,
  s: SubmissionPDFData
) {
  // Add new page
  await k.addPage();
  
  // Add title: "LAMPIRAN DOKUMEN"
  // Add subtitle: "Dokumen Pendukung SIMLOK"
  
  // Collect documents to display
  const documents = [];
  
  if (s.simja_document_upload) {
    documents.push({
      path: s.simja_document_upload,
      title: 'SIMJA',
      subtitle: s.simja_type || '',
      number: s.simja_number || '-',
      date: s.simja_date ? fmtDateID(s.simja_date) : '-'
    });
  }
  
  if (s.sika_document_upload) {
    documents.push({
      path: s.sika_document_upload,
      title: 'SIKA',
      subtitle: s.sika_type || '',
      number: s.sika_number || '-',
      date: s.sika_date ? fmtDateID(s.sika_date) : '-'
    });
  }
  
  if (s.hsse_pass_document_upload) {
    documents.push({
      path: s.hsse_pass_document_upload,
      title: 'HSSE Pass',
      subtitle: '',
      number: s.hsse_pass_number || '-',
      date: s.hsse_pass_valid_thru ? fmtDateID(s.hsse_pass_valid_thru) : '-'
    });
  }
  
  // Draw each document in grid layout
  // - 2 columns x 2 rows
  // - Each cell: 220px wide x 280px high
  // - Shows: Title, Type, Number, Date, Document Image/PDF
}
```

**Layout Dimensions:**
- **Grid:** 2 kolom × 2 baris (maksimal 4 dokumen)
- **Cell Size:** 220px width × 280px height
- **Document Frame:**
  - Border: 1px solid gray
  - Title Area: ~50px (title + subtitle + info)
  - Document Area: ~230px (image/PDF preview)
- **Gaps:**
  - Horizontal: 30px
  - Vertical: 30px

### 3. **Integrate into PDF Generation Flow**

**File:** `src/utils/pdf/simlokTemplate.ts` - `generateSIMLOKPDF()`

```typescript
export async function generateSIMLOKPDF(submissionData: SubmissionPDFData) {
  // ... generate page 1 (SIMLOK main content) ...
  
  // ✅ NEW: Add supporting documents page (if any documents exist)
  const hasDocuments = s.simja_document_upload || 
                       s.sika_document_upload || 
                       s.hsse_pass_document_upload;
  if (hasDocuments) {
    await addSupportingDocumentsPage(k, s);
  }
  
  // Add worker photos page (existing functionality)
  const workerData = s.workerList || (s as any).worker_list;
  if (workerData && workerData.length > 0) {
    await addWorkerPhotosPage(k, workerData);
  }
  
  return k.doc.save();
}
```

---

## 📐 **Layout Design**

### **Halaman Lampiran Dokumen**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              LAMPIRAN DOKUMEN                           │
│         Dokumen Pendukung SIMLOK                        │
│                                                         │
├──────────────────────┬──────────────────────────────────┤
│ ┌──────────────────┐ │ ┌──────────────────────────────┐ │
│ │ SIMJA            │ │ │ SIKA                         │ │
│ │ (Type jika ada)  │ │ │ (Type jika ada)              │ │
│ │                  │ │ │                              │ │
│ │ No: xxx          │ │ │ No: xxx                      │ │
│ │ Tanggal: xxx     │ │ │ Tanggal: xxx                 │ │
│ │                  │ │ │                              │ │
│ │ [Document Image] │ │ │ [Document Image]             │ │
│ │                  │ │ │                              │ │
│ │                  │ │ │                              │ │
│ └──────────────────┘ │ └──────────────────────────────┘ │
├──────────────────────┼──────────────────────────────────┤
│ ┌──────────────────┐ │ ┌──────────────────────────────┐ │
│ │ HSSE Pass        │ │ │ (Empty if < 4 docs)          │ │
│ │                  │ │ │                              │ │
│ │ No: xxx          │ │ │                              │ │
│ │ Berlaku: xxx     │ │ │                              │ │
│ │                  │ │ │                              │ │
│ │ [Document Image] │ │ │                              │ │
│ │                  │ │ │                              │ │
│ │                  │ │ │                              │ │
│ └──────────────────┘ │ └──────────────────────────────┘ │
└──────────────────────┴──────────────────────────────────┘
```

### **Setiap Cell Dokumen:**

```
┌────────────────────────┐
│ SIMJA (Bold, 12pt)     │ ← Title
│ Pekerjaan Dingin       │ ← Subtitle (type, 10pt, gray)
│                        │
│ No: 123/SIMJA/2025     │ ← Info (9pt)
│ Tanggal: 15 Okt 2025   │ ← Info (9pt)
│                        │
│ ┌──────────────────┐   │
│ │                  │   │
│ │   [Document]     │   │ ← Image/PDF Preview
│ │   Preview        │   │   (centered, aspect ratio preserved)
│ │                  │   │
│ └──────────────────┘   │
└────────────────────────┘
```

---

## 🎨 **Document Display Logic**

### **Image Documents (JPG, PNG, WebP)**

```typescript
if (documentResult.type === 'image' && documentResult.image) {
  const img = documentResult.image;
  const imgDims = img.scale(1);
  const aspectRatio = imgDims.width / imgDims.height;
  
  // Calculate dimensions to fit in available space
  let drawWidth = imageWidth;   // max 200px
  let drawHeight = imageHeight; // max 230px
  
  // Preserve aspect ratio
  if (aspectRatio > (imageWidth / imageHeight)) {
    drawHeight = drawWidth / aspectRatio;
  } else {
    drawWidth = drawHeight * aspectRatio;
  }
  
  // Center the image in the cell
  const drawX = x + 10 + (imageWidth - drawWidth) / 2;
  const drawY = imageY - drawHeight;
  
  page.drawImage(img, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
}
```

### **PDF Documents**

```typescript
else if (documentResult.type === 'pdf' && documentResult.pdfPages) {
  // Embed first page of PDF
  const embeddedPages = await k.doc.embedPdf(documentResult.pdfPages, [0]);
  const embeddedPage = embeddedPages[0];
  
  if (embeddedPage) {
    const pageDims = embeddedPage.scale(1);
    const aspectRatio = pageDims.width / pageDims.height;
    
    // Same sizing logic as images
    let drawWidth = imageWidth;
    let drawHeight = imageHeight;
    
    if (aspectRatio > (imageWidth / imageHeight)) {
      drawHeight = drawWidth / aspectRatio;
    } else {
      drawWidth = drawHeight * aspectRatio;
    }
    
    const drawX = x + 10 + (imageWidth - drawWidth) / 2;
    const drawY = imageY - drawHeight;
    
    page.drawPage(embeddedPage, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
  }
}
```

### **Error Handling**

```typescript
else {
  // Draw placeholder for error
  k.text('Dokumen tidak tersedia', x + 10, placeholderY, {
    size: 10,
    color: rgb(0.6, 0.6, 0.6),
  });
}
```

---

## 📊 **Document Loading**

Menggunakan `loadWorkerDocument()` yang sudah ada:

```typescript
const documentResult = await loadWorkerDocument(k.doc, doc.path);

// Returns:
interface DocumentLoadResult {
  type: 'image' | 'pdf' | 'unsupported';
  image?: PDFImage;        // For JPG, PNG, WebP
  pdfPages?: PDFDocument;  // For PDF files
  error?: string;
}
```

**Keuntungan:**
- ✅ Reuse existing code (DRY principle)
- ✅ Mendukung semua format (JPG, PNG, WebP, PDF)
- ✅ Smart fallback path resolution
- ✅ Caching untuk performance
- ✅ Comprehensive error handling

---

## 🔄 **Conditional Page Generation**

Halaman lampiran dokumen **hanya ditambahkan jika ada dokumen:**

```typescript
const hasDocuments = s.simja_document_upload || 
                     s.sika_document_upload || 
                     s.hsse_pass_document_upload;

if (hasDocuments) {
  await addSupportingDocumentsPage(k, s);
}
```

**Skenario:**

| SIMJA | SIKA | HSSE Pass | Result |
|-------|------|-----------|--------|
| ✓ | ✓ | ✓ | Halaman ditambahkan, 3 dokumen ditampilkan |
| ✓ | ✓ | - | Halaman ditambahkan, 2 dokumen ditampilkan |
| ✓ | - | - | Halaman ditambahkan, 1 dokumen ditampilkan |
| - | - | - | Halaman **TIDAK** ditambahkan |

---

## 🧪 **Testing**

### **Test Case 1: Semua Dokumen Ada**
```
Input:
- simja_document_upload: "/uploads/user123/simja/doc.pdf"
- sika_document_upload: "/uploads/user123/sika/doc.jpg"
- hsse_pass_document_upload: "/uploads/user123/hsse/doc.png"

Expected Output:
✓ Halaman 2 ditambahkan dengan judul "LAMPIRAN DOKUMEN"
✓ 3 dokumen ditampilkan dalam grid 2x2
✓ Setiap dokumen menampilkan: title, type, number, date, preview
✓ Preview dokumen ter-load dengan benar (PDF embed page 1, Image center-fitted)
```

### **Test Case 2: Hanya SIMJA**
```
Input:
- simja_document_upload: "/uploads/user123/simja/doc.pdf"
- sika_document_upload: null
- hsse_pass_document_upload: null

Expected Output:
✓ Halaman 2 ditambahkan
✓ 1 dokumen (SIMJA) ditampilkan di posisi top-left
✓ Posisi lain kosong (tidak ada frame)
```

### **Test Case 3: Tidak Ada Dokumen**
```
Input:
- simja_document_upload: null
- sika_document_upload: null
- hsse_pass_document_upload: null

Expected Output:
✓ Halaman lampiran dokumen TIDAK ditambahkan
✓ PDF langsung lanjut ke halaman daftar pekerja (jika ada)
```

### **Test Case 4: Error Loading Document**
```
Input:
- simja_document_upload: "/invalid/path/doc.pdf" (file tidak ada)

Expected Output:
✓ Halaman 2 ditambahkan
✓ Frame SIMJA ditampilkan dengan title dan info
✓ Di area preview: "Dokumen tidak tersedia" (placeholder)
✓ Console log: Warning about failed document load
```

---

## 📝 **Console Logging**

Untuk debugging:

```
[AddSupportingDocumentsPage] Creating documents page...
[AddSupportingDocumentsPage] Found 3 documents to display
[AddSupportingDocumentsPage] Drawing SIMJA at position (187, 701)
[AddSupportingDocumentsPage] ✅ SIMJA image drawn successfully
[AddSupportingDocumentsPage] Drawing SIKA at position (447, 701)
[AddSupportingDocumentsPage] ✅ SIKA PDF drawn successfully
[AddSupportingDocumentsPage] Drawing HSSE Pass at position (187, 391)
[AddSupportingDocumentsPage] ⚠️ HSSE Pass failed to load: File not found
[AddSupportingDocumentsPage] Documents page completed
```

---

## 🎯 **Benefits**

### **Untuk User:**
1. ✅ **Satu PDF Lengkap:** Semua dokumen pendukung dalam satu file
2. ✅ **Mudah Verifikasi:** Dokumen perusahaan terpisah dari dokumen pekerja
3. ✅ **Professional:** Layout grid yang rapi dan terstruktur
4. ✅ **Quick Review:** Preview dokumen langsung terlihat tanpa buka file terpisah

### **Untuk Developer:**
1. ✅ **Reusable Code:** Menggunakan `loadWorkerDocument()` yang sudah ada
2. ✅ **Maintainable:** Fungsi terpisah, mudah di-update
3. ✅ **Flexible:** Mendukung berbagai format (Image, PDF)
4. ✅ **Robust:** Error handling yang baik dengan placeholders

### **Untuk Performance:**
1. ✅ **Cached Loading:** Dokumen di-cache untuk reuse
2. ✅ **Lazy Generation:** Halaman hanya ditambahkan jika ada dokumen
3. ✅ **Optimized Images:** Menggunakan optimized buffers dari cache
4. ✅ **Parallel Processing:** Bisa load multiple documents bersamaan

---

## 🔍 **Implementation Details**

### **File Changes:**

1. **`src/types/submission.ts`**
   - Added: `simja_document_upload?: string | null`
   - Added: `sika_document_upload?: string | null`

2. **`src/utils/pdf/simlokTemplate.ts`**
   - Added: `addSupportingDocumentsPage()` function
   - Modified: `generateSIMLOKPDF()` to call new function
   - Uses: `loadWorkerDocument()` from imageLoader.ts

3. **Database Schema** (No changes needed)
   - Fields already exist in Prisma schema:
     - `simja_document_upload`
     - `sika_document_upload`
     - `hsse_pass_document_upload`

---

## ✅ **Status**

- [x] Type definition updated
- [x] `addSupportingDocumentsPage()` function created
- [x] Integrated into PDF generation flow
- [x] TypeScript compilation: 0 errors
- [ ] Testing with real documents
- [ ] User acceptance testing

---

## 🚀 **Next Steps**

1. **Test PDF Generation:**
   - Upload SIMJA, SIKA, HSSE Pass documents
   - Generate PDF
   - Verify halaman lampiran dokumen muncul dengan benar

2. **Verify Layout:**
   - Check document positioning in grid
   - Verify aspect ratio preservation
   - Test with different image sizes

3. **Error Handling:**
   - Test with missing documents
   - Test with invalid file paths
   - Verify placeholder displays correctly

4. **Performance:**
   - Check PDF generation speed
   - Verify caching works for documents
   - Monitor memory usage with large PDFs

---

**Feature Complete!** 🎉

Halaman lampiran dokumen akan otomatis muncul di posisi halaman kedua (setelah halaman SIMLOK utama, sebelum daftar pekerja) ketika ada dokumen SIMJA, SIKA, atau HSSE Pass yang di-upload.
