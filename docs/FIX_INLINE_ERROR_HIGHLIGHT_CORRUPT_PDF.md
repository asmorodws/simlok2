# Fix: Inline Error Highlight untuk Dokumen PDF yang Corrupt

## 📋 Ringkasan
Menambahkan visual feedback (highlight merah + banner error) pada card dokumen yang terdeteksi corrupt saat user mencoba submit form pengajuan, sehingga user tahu persis dokumen mana yang harus diganti.

## 🎯 Tujuan
- Memberikan feedback visual yang jelas tentang dokumen mana yang bermasalah
- Meningkatkan UX dengan menunjukkan error secara inline (langsung di card dokumen)
- Memudahkan user untuk menemukan dan memperbaiki dokumen yang corrupt

## 🔧 Perubahan yang Dilakukan

### 1. SubmissionForm.tsx
**State baru:**
```typescript
const [invalidDocuments, setInvalidDocuments] = useState<Map<string, string>>(new Map());
```
- Menyimpan mapping dari document ID ke error message
- Digunakan untuk highlight card dokumen yang bermasalah

**Update validasi:**
```typescript
// Di dalam handleSubmit, setelah filter valid documents
const invalidDocs = new Map<string, string>();
let hasInvalidDoc = false;

// Loop through all documents dan validate
for (let i = 0; i < allAttachedDocs.length; i++) {
  const doc = allAttachedDocs[i];
  // ... fetch and validate PDF ...
  
  if (!validation.isValid) {
    const errorMsg = validation.error || 'File PDF tidak valid atau rusak';
    invalidDocs.set(doc.id, errorMsg);
    hasInvalidDoc = true;
  }
}

// Jika ada dokumen invalid, set state dan block submission
if (hasInvalidDoc) {
  setInvalidDocuments(invalidDocs);
  showError(...);
  resetSubmission();
  return;
}
```

**Props baru ke SupportDocumentList:**
```typescript
<SupportDocumentList
  // ... existing props ...
  invalidDocumentIds={invalidDocuments}
/>
```

### 2. SupportDocumentList.tsx
**Props interface update:**
```typescript
interface SupportDocumentListProps {
  // ... existing props ...
  invalidDocumentIds?: Map<string, string>; // Map of document ID to error message
}
```

**Card rendering dengan highlight:**
```typescript
{documents.map((doc, index) => {
  // Check if this document has validation error
  const hasError = invalidDocumentIds?.has(doc.id) ?? false;
  const errorMessage = hasError && invalidDocumentIds 
    ? invalidDocumentIds.get(doc.id) 
    : undefined;
  
  return (
    <div
      className={`border rounded-lg p-4 bg-white relative ${
        hasError ? 'border-red-500 border-2 bg-red-50' : 'border-gray-200'
      }`}
    >
      {/* Error banner at top if document is invalid */}
      {hasError && errorMessage && (
        <div className="mb-4 -mt-2 -mx-2 px-4 py-3 bg-red-100 border-b-2 border-red-500 rounded-t-lg">
          {/* Error icon dan message */}
        </div>
      )}
      
      {/* ... rest of card content ... */}
    </div>
  );
})}
```

## 🎨 Visual Changes

### Before (tanpa highlight):
```
┌─────────────────────────────────┐
│ SIMJA                      Hapus│
├─────────────────────────────────┤
│ Jenis: ...                      │
│ Nomor: ...                      │
│ Upload: [PDF icon]              │
└─────────────────────────────────┘
```

### After (dengan error highlight):
```
┌═══════════════════════════════════════════┐
║ ⚠️ Dokumen PDF Bermasalah                 ║  <- Red banner
║ File PDF tidak dapat dibuka. File        ║
║ mungkin rusak atau corrupt.               ║
║ ⚠️ Silakan hapus dan unggah ulang...     ║
╞═══════════════════════════════════════════╡
│ SIMJA                              Hapus  │  <- Red border
│ Jenis: ...                                │  <- Red background
│ Nomor: ...                                │
│ Upload: [PDF icon]                        │
└───────────────────────────────────────────┘
```

## 🔍 Flow Validasi

1. **User klik Submit** → `handleSubmit()` dipanggil
2. **Clear previous errors** → `setInvalidDocuments(new Map())`
3. **Loop semua dokumen** yang sudah diupload
4. **Fetch setiap PDF** dari URL
5. **Validate dengan validatePDFDocument()** dari `/src/utils/fileValidation.ts`
6. **Jika invalid** → tambahkan ke `invalidDocs` Map
7. **Jika ada invalid docs** → 
   - Set state `invalidDocuments` 
   - Show toast error
   - Block submission
   - Return early
8. **UI re-render** → Card dengan ID di `invalidDocuments` ditampilkan dengan:
   - Border merah (2px)
   - Background merah muda (`bg-red-50`)
   - Banner error di atas card dengan icon warning dan pesan detail

## ✅ Testing Checklist

- [ ] Upload PDF corrupt → Submit → Card highlight merah dengan error message
- [ ] Upload PDF valid → Submit → Card normal (border abu-abu)
- [ ] Multiple PDFs, 1 corrupt → Hanya card corrupt yang highlight merah
- [ ] Fix corrupt PDF → Re-submit → Highlight hilang, submit sukses
- [ ] Error message akurat (sesuai dengan error dari validator)
- [ ] Toast error muncul saat ada dokumen corrupt
- [ ] Submission di-block saat ada dokumen corrupt

## 📝 Notes

### Keuntungan pendekatan ini:
1. **Clear visual feedback** - User langsung tahu dokumen mana yang bermasalah
2. **Error message detail** - Ditampilkan langsung di card, tidak perlu scroll cari toast
3. **Non-intrusive** - Tidak menghalangi user untuk melihat/edit field lain
4. **Actionable** - Banner error memberikan instruksi jelas: "Hapus dan unggah ulang"

### Edge cases yang ditangani:
- Multiple documents corrupt → Semua di-highlight
- Fetch gagal (CORS/network) → Treated sebagai invalid, ditampilkan error message
- PDF validation timeout → Caught dan ditampilkan sebagai error
- User fix dan re-submit → State di-clear, highlight hilang

### Performance consideration:
- Validasi hanya dilakukan saat submit (bukan on-change)
- Fetch parallel untuk semua dokumen (tidak sequential)
- State update sekali saja setelah semua validasi selesai
- Map structure untuk O(1) lookup saat rendering

## 🔗 Related Files
- `/src/components/submissions/SubmissionForm.tsx`
- `/src/components/submissions/SupportDocumentList.tsx`
- `/src/utils/fileValidation.ts`
- `/docs/FIX_PDF_CORRUPTION_VALIDATION.md` (server-side validation)
- `/docs/FILE_UPLOAD_VALIDATION_IMPLEMENTATION.md` (client-side validation setup)

## 📅 Date
November 12, 2025
