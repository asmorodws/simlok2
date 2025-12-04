# Fix: Vendor Edit Submission - Data Persistence Issue

**Tanggal**: 5 Desember 2025  
**Masalah**: Beberapa data input pada edit simlok tidak tersimpan dengan benar di database  
**Status**: ✅ **FIXED**

---

## 🔍 Analisis Masalah

### Gejala
Ketika vendor mengedit submission yang existing, beberapa field tidak tersimpan ke database:
1. **Tanggal Pelaksanaan** (`implementation_start_date`, `implementation_end_date`) - tidak tersimpan
2. **Support Documents** (SIMJA, SIKA, Work Order, Kontrak Kerja, JSA) - tidak ter-update

### Root Cause
API endpoint `PUT /api/submissions/[id]` memiliki **handling yang tidak lengkap** untuk vendor update:

**Sebelum Fix:**
```typescript
// Line 480-503 - src/app/api/submissions/[id]/route.ts
else if (session.user.role === 'VENDOR') {
  const allowedFields = [
    'vendor_name', 'based_on', 'officer_name', 'job_description', 
    'work_location', 'working_hours', 'holiday_working_hours', 'work_facilities', 'worker_count',
    'simja_number', 'simja_date', 'sika_number', 'sika_date', 'worker_names',
    'sika_document_upload', 'simja_document_upload'
  ];
  // ❌ TIDAK ADA: implementation_start_date, implementation_end_date
  
  // Handle date fields
  if (body.simja_date) updateData.simja_date = new Date(body.simja_date);
  if (body.sika_date) updateData.sika_date = new Date(body.sika_date);
  // ❌ TIDAK ADA: implementation dates handling
}

// Handle workers if provided (only for vendor updates)
if (session.user.role === 'VENDOR' && body.workers && Array.isArray(body.workers)) {
  // ... workers handling OK ✅
}
// ❌ TIDAK ADA: Support documents handling untuk vendor
```

### Dampak
1. **Edit Form** mengirim data lengkap (`EditSubmissionForm.tsx` line 893-900)
2. **API Endpoint** menerima data tapi **TIDAK menyimpan** semua field
3. **Database** tidak ter-update untuk implementation dates dan support documents
4. User mengalami data hilang setelah edit submission

---

## ✅ Solusi yang Diimplementasikan

### 1. Tambahkan Implementation Dates Handling

**File**: `src/app/api/submissions/[id]/route.ts` (Line 503-510)

```typescript
// Handle date fields
if (body.simja_date) {
  updateData.simja_date = new Date(body.simja_date);
}
if (body.sika_date) {
  updateData.sika_date = new Date(body.sika_date);
}

// 🔧 FIX: Handle implementation dates for vendor
if (body.implementation_start_date) {
  updateData.implementation_start_date = new Date(body.implementation_start_date);
}
if (body.implementation_end_date) {
  updateData.implementation_end_date = new Date(body.implementation_end_date);
}
```

### 2. Tambahkan Support Documents Handling

**File**: `src/app/api/submissions/[id]/route.ts` (setelah workers handling)

```typescript
// 🔧 FIX: Handle support documents if provided (for vendor updates)
if (session.user.role === 'VENDOR') {
  const {
    simjaDocuments,
    sikaDocuments,
    workOrderDocuments,
    kontrakKerjaDocuments,
    jsaDocuments
  } = body;

  // If any document arrays are provided, update them
  if (simjaDocuments || sikaDocuments || workOrderDocuments || kontrakKerjaDocuments || jsaDocuments) {
    // 1. Delete existing support documents
    await prisma.supportDocument.deleteMany({
      where: { submission_id: id }
    });

    const allDocuments = [];

    // 2. Process SIMJA documents
    if (simjaDocuments && Array.isArray(simjaDocuments) && simjaDocuments.length > 0) {
      const simjaDocs = simjaDocuments
        .filter((doc: any) => doc.document_upload && doc.document_upload.trim())
        .map((doc: any) => ({
          document_subtype: doc.document_subtype || 'Ast. Man. Facility Management',
          document_type: 'SIMJA',
          document_number: doc.document_number,
          document_date: doc.document_date ? new Date(doc.document_date) : null,
          document_upload: doc.document_upload,
          submission_id: id,
          uploaded_by: session.user.id,
          uploaded_at: new Date(),
        }));
      allDocuments.push(...simjaDocs);
    }

    // 3. Process SIKA documents
    // ... (similar pattern for SIKA, Work Order, Kontrak Kerja, JSA)

    // 4. Save all documents at once
    if (allDocuments.length > 0) {
      await prisma.supportDocument.createMany({
        data: allDocuments,
      });
    }
  }
}
```

---

## 🔄 Data Flow Lengkap

### Edit Form → API → Database

1. **EditSubmissionForm.tsx** (Line 893-900):
   ```typescript
   const formattedData = {
     // ... basic fields
     implementation_start_date: implementationDates.startDate,
     implementation_end_date: implementationDates.endDate,
     workers: workers.map(worker => ({
       worker_name: worker.worker_name.trim(),
       worker_photo: worker.worker_photo,
       hsse_pass_number: worker.hsse_pass_number?.trim(),
       hsse_pass_valid_thru: worker.hsse_pass_valid_thru,
       hsse_pass_document_upload: worker.hsse_pass_document_upload
     })),
     simjaDocuments: validSimjaDocuments,
     sikaDocuments: validSikaDocuments,
     // ... other documents
   };
   ```

2. **PUT /api/submissions/[id]** (Line 503-641):
   - ✅ Validate user permissions
   - ✅ Update basic submission fields
   - ✅ **Handle implementation dates** (NEW)
   - ✅ Delete & recreate workers (existing - already includes HSSE fields)
   - ✅ **Delete & recreate support documents** (NEW)
   - ✅ Return updated submission

3. **Database Tables Updated**:
   - `Submission` table: implementation_start_date, implementation_end_date
   - `WorkerList` table: all workers with HSSE fields
   - `SupportDocument` table: all support documents

---

## 🧪 Testing Checklist

### Test Scenario 1: Edit Implementation Dates
- [ ] Edit submission dengan tanggal pelaksanaan baru
- [ ] Submit form
- [ ] Verifikasi tanggal tersimpan di database
- [ ] Reload page dan cek data masih ada

### Test Scenario 2: Edit Support Documents
- [ ] Edit submission dan ubah dokumen SIMJA
- [ ] Tambah dokumen SIKA baru
- [ ] Hapus dokumen Work Order
- [ ] Submit form
- [ ] Verifikasi semua perubahan tersimpan
- [ ] Reload page dan cek dokumen sesuai

### Test Scenario 3: Edit Workers with HSSE
- [ ] Edit submission dan ubah nama pekerja
- [ ] Update HSSE Pass number dan tanggal
- [ ] Submit form
- [ ] Verifikasi workers dan HSSE fields tersimpan
- [ ] Reload page dan cek data masih lengkap

### Test Scenario 4: Mixed Edit
- [ ] Edit semua field sekaligus (tanggal, dokumen, workers)
- [ ] Submit form
- [ ] Verifikasi SEMUA perubahan tersimpan
- [ ] Reload page dan cek konsistensi data

---

## 📝 Notes

### Related Files Modified
1. `src/app/api/submissions/[id]/route.ts` - Main fix
2. `docs/FIX_VENDOR_EDIT_SUBMISSION_DATA_PERSISTENCE.md` - Documentation

### Related Issues Fixed
- Workers HSSE fields sudah di-fix sebelumnya (line 543-550)
- Implementation dates handling untuk VENDOR role (BARU)
- Support documents handling untuk VENDOR role (BARU)

### Similar Pattern
Handling support documents di edit endpoint mengikuti pattern yang sama dengan POST endpoint (`src/app/api/submissions/route.ts` line 508-600):
- Delete existing documents
- Filter valid documents
- Map to database format
- Create many at once

---

## 🚀 Build Status

```bash
✓ Compiled successfully
✓ Linting and type checking passed
✓ Generating static pages (65/65)
✓ Build completed successfully
```

**Status**: ✅ Ready for testing and deployment
