# Dukungan Dokumen PDF pada SIMLOK

## Ringkasan Perubahan

Sistem SIMLOK sekarang mendukung dokumen HSSE Pass pekerja dalam format **PDF** maupun **gambar** (JPG, PNG).

### Sebelumnya
- ❌ Dokumen HSSE Pass pekerja hanya bisa berupa gambar (JPG/PNG)
- ❌ Upload PDF akan menyebabkan error "SOI not found in JPEG"
- ❌ PDF generation gagal saat mencoba render dokumen PDF

### Sekarang
- ✅ Dokumen HSSE Pass pekerja bisa berupa PDF atau gambar
- ✅ Sistem otomatis mendeteksi tipe file
- ✅ PDF ditampilkan dengan placeholder informatif
- ✅ Gambar tetap di-render seperti biasa

## Implementasi Teknis

### 1. Fungsi Baru: `loadWorkerDocument()`

File: `/src/utils/pdf/imageLoader.ts`

```typescript
export interface DocumentLoadResult {
  type: 'image' | 'pdf' | 'unsupported';
  image?: PDFImage;
  pdfPages?: PDFDocument;
  error?: string;
}

export async function loadWorkerDocument(
  pdfDoc: PDFDocument,
  documentPath?: string | null
): Promise<DocumentLoadResult>
```

**Cara Kerja:**
1. Deteksi tipe file dari extension (`.pdf`, `.jpg`, `.png`, `.webp`)
2. Untuk **gambar**: gunakan fungsi `loadWorkerPhoto()` yang sudah ada
3. Untuk **PDF**: load file PDF dan return PDFDocument object
4. Return hasil dengan tipe yang terdeteksi

### 2. Update Rendering di SIMLOK Template

File: `/src/utils/pdf/simlokTemplate.ts`

**Logika Rendering:**

```typescript
const documentResult = await loadWorkerDocument(doc, worker.hsse_pass_document_upload);

if (documentResult.type === 'image' && documentResult.image) {
  // Render gambar seperti biasa
  page.drawImage(documentResult.image, { ... });
  
} else if (documentResult.type === 'pdf' && documentResult.pdfPages) {
  // Tampilkan placeholder untuk PDF
  // - Background biru muda
  // - Icon 📄
  // - Text "Dokumen PDF"
  // - Info jumlah halaman
  
} else {
  // Tampilkan error placeholder
}
```

## Tampilan PDF di SIMLOK

Ketika dokumen HSSE Pass adalah PDF, akan ditampilkan:

```
┌─────────────────┐
│                 │
│       📄        │
│  Dokumen PDF    │
│  X halaman      │
│                 │
└─────────────────┘
```

**Visual:**
- Background: Light blue (`rgb(0.95, 0.97, 1.0)`)
- Border: Blue (`rgb(0.2, 0.4, 0.8)`)
- Icon: 📄 (size 20, blue)
- Text: "Dokumen PDF" + jumlah halaman

## Format File yang Didukung

### ✅ Gambar (Rendered)
- `.jpg` / `.jpeg`
- `.png`
- `.webp`

### ✅ PDF (Placeholder)
- `.pdf`

### ❌ Tidak Didukung
- `.doc` / `.docx`
- File lainnya

## Penggunaan

### Upload Dokumen HSSE Pass Pekerja

Form submission mendukung kedua format:

```tsx
<EnhancedFileUpload
  id={`hsse_doc_${workerId}`}
  name={`hsse_doc_${workerId}`}
  value={worker.hsse_pass_document_upload || ''}
  onChange={(url) => updateWorkerHsseDocument(workerId, url)}
  uploadType="document"
  maxFileNameLength={15}
  required={false}
/>
```

**Accepted types:** `.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp`

### Generate PDF SIMLOK

Tidak ada perubahan dari sisi user. System otomatis handle:

```typescript
// System akan otomatis deteksi tipe dokumen
const pdfBytes = await generateSimlokPdf(submissionData);
```

## Testing

### Test Case 1: Worker dengan Gambar HSSE
```
Input: worker.hsse_pass_document_upload = "/api/files/.../hsse-worker/HSSE_123.jpg"
Expected: Gambar ter-render di PDF SIMLOK
```

### Test Case 2: Worker dengan PDF HSSE
```
Input: worker.hsse_pass_document_upload = "/api/files/.../hsse-worker/HSSE_456.pdf"
Expected: Placeholder "📄 Dokumen PDF, X halaman" di PDF SIMLOK
```

### Test Case 3: Worker tanpa HSSE
```
Input: worker.hsse_pass_document_upload = null
Expected: Placeholder "Tidak ada dok" di PDF SIMLOK
```

### Test Case 4: Format tidak didukung
```
Input: worker.hsse_pass_document_upload = "/api/files/.../hsse-worker/HSSE_789.doc"
Expected: Placeholder "Dokumen error" di PDF SIMLOK
```

## Error Handling

### Level 1: File tidak ditemukan
```
Result: { type: 'unsupported', error: 'Failed to load image' }
Display: "Dokumen error"
```

### Level 2: Format tidak didukung
```
Result: { type: 'unsupported', error: 'Unsupported file type' }
Display: "Dokumen error"
```

### Level 3: PDF corrupted
```
Result: { type: 'unsupported', error: 'Failed to load PDF: ...' }
Display: "Dokumen error"
```

### Level 4: Rendering error
```
Catch block pada drawImage/drawRectangle
Display: "Error loading"
```

## Benefits

1. ✅ **Fleksibilitas Upload** - User bisa upload PDF atau gambar
2. ✅ **No More Errors** - Tidak ada lagi "SOI not found" error
3. ✅ **Clear Visual Feedback** - PDF dibedakan dengan gambar
4. ✅ **Backward Compatible** - Gambar tetap di-render seperti biasa
5. ✅ **Better UX** - User tahu dokumen PDF tersedia (meskipun tidak ter-embed)

## Limitations

⚠️ **PDF tidak di-render penuh ke dalam SIMLOK PDF**

**Alasan:**
- pdf-lib tidak support native PDF page embedding
- Rendering PDF-to-image membutuhkan library eksternal (pdf-poppler, pdf.js, dll)
- Ukuran file akan sangat besar jika embed full PDF pages

**Alternatif:**
- Dokumen PDF tetap tersimpan di server
- SIMLOK PDF menunjukkan placeholder informatif
- User bisa akses dokumen PDF asli lewat database/admin panel

## Future Enhancements

Jika diperlukan render penuh PDF:

1. **Option 1:** Convert PDF to image server-side
   - Gunakan `pdf-poppler` atau `pdf2pic`
   - Render halaman pertama PDF jadi image
   - Embed image ke SIMLOK PDF

2. **Option 2:** Attach PDF as attachment
   - Gunakan `attachFileToDocument()` pdf-lib
   - PDF HSSE sebagai lampiran SIMLOK PDF
   - User bisa buka lampiran dari PDF reader

3. **Option 3:** Show QR code to PDF
   - Generate QR code yang link ke PDF
   - User scan QR untuk lihat dokumen asli

## Files Modified

1. `/src/utils/pdf/imageLoader.ts`
   - ✅ Added `DocumentLoadResult` interface
   - ✅ Added `loadWorkerDocument()` function

2. `/src/utils/pdf/simlokTemplate.ts`
   - ✅ Updated import to include `loadWorkerDocument`
   - ✅ Updated HSSE document rendering logic
   - ✅ Added PDF placeholder rendering

## Compatibility

- ✅ Next.js 15
- ✅ pdf-lib 1.17+
- ✅ Node.js 18+
- ✅ TypeScript 5+

## Migration Notes

**Tidak perlu migrasi data!**

System otomatis detect file type saat generate PDF. Dokumen yang sudah di-upload (baik gambar maupun PDF) akan tetap berfungsi.

---

**Last Updated:** October 19, 2025  
**Version:** 1.0.0
