# Submission Revision Flow - Complete Implementation

## 📋 Overview

Implementasi lengkap alur revisi pengajuan SIMLOK dimana reviewer dapat meminta vendor untuk memperbaiki pengajuan yang tidak memenuhi syarat, vendor dapat mengedit dan mengirim ulang, kemudian reviewer dapat mereview kembali.

**Tanggal Implementasi:** 14 November 2025

---

## 🔄 **Alur Baru (Revision Flow)**

### **Sebelumnya (Auto-Reject):**
```
1. Vendor submit pengajuan
2. Reviewer review → NOT_MEETS_REQUIREMENTS
3. ❌ Status langsung REJECTED
4. Vendor dinotifikasi tapi tidak bisa edit
5. ✗ Harus buat pengajuan baru
```

### **Sekarang (Revision Flow):**
```
1. Vendor submit pengajuan
   ↓
2. Reviewer review → NOT_MEETS_REQUIREMENTS
   ↓
3. ✅ Status jadi NEEDS_REVISION
   ↓
4. Vendor dinotifikasi dengan catatan reviewer
   ↓
5. ✅ Vendor dapat EDIT pengajuan yang sama
   ↓
6. Vendor klik "Kirim Ulang Setelah Perbaikan"
   ↓
7. Status kembali ke PENDING_REVIEW
   ↓
8. Reviewer dinotifikasi ada submission yang sudah diperbaiki
   ↓
9. Reviewer review ulang
   ↓
10. Jika OK → MEETS_REQUIREMENTS → Approver
    Jika masih tidak OK → NEEDS_REVISION lagi (loop ke step 3)
```

---

## 🗂️ **Changes Made**

### **1. Database Schema Update**

**File:** `prisma/schema.prisma`

#### Added NEEDS_REVISION Status:
```prisma
enum ApprovalStatus {
  PENDING_APPROVAL
  APPROVED
  REJECTED
  NEEDS_REVISION  // ✅ NEW: Submission needs to be fixed by vendor
}
```

#### Migration Created:
```bash
20251113171136_add_needs_revision_status/migration.sql
```

**Status Meanings:**
- `PENDING_APPROVAL`: Menunggu review dari reviewer
- `NEEDS_REVISION`: Vendor perlu memperbaiki berdasarkan catatan reviewer
- `APPROVED`: Disetujui oleh approver
- `REJECTED`: Ditolak final oleh approver (tidak bisa direvisi)

---

### **2. Review API Logic Update**

**File:** `src/app/api/submissions/[id]/review/route.ts`

#### Changes:
```typescript
// ❌ BEFORE: Auto-reject
if (validatedData.review_status === 'NOT_MEETS_REQUIREMENTS') {
  updateData.approval_status = 'REJECTED';  // Final rejection
  updateData.approved_at = new Date();
  updateData.approved_by = session.user.officer_name;
  updateData.approved_by_final_id = session.user.id;
}

// ✅ AFTER: Request revision
if (validatedData.review_status === 'NOT_MEETS_REQUIREMENTS') {
  updateData.approval_status = 'NEEDS_REVISION';  // Allows vendor to edit
  // No approved_at, approved_by - not final yet
  console.log(`📝 Requesting revision for submission ${id}`);
  await notifyVendorSubmissionRejected(existingSubmission, ...);
}
```

**Key Differences:**
- ❌ `REJECTED`: Final, vendor cannot edit
- ✅ `NEEDS_REVISION`: Temporary, vendor can edit and resubmit

---

### **3. New Resubmit API Endpoint**

**File:** `src/app/api/submissions/[id]/resubmit/route.ts` (✅ NEW FILE)

#### Endpoint Details:
- **Method:** `PATCH`
- **Path:** `/api/submissions/[id]/resubmit`
- **Authorization:** VENDOR only
- **Ownership:** Verified before allowing resubmit

#### Logic Flow:
```typescript
1. Verify user is VENDOR
2. Check submission belongs to this vendor
3. Validate status is NEEDS_REVISION
4. Update submission:
   - approval_status: 'PENDING_APPROVAL'
   - review_status: 'PENDING_REVIEW'
   - Clear: reviewed_at, reviewed_by, note_for_approver
   - Keep: note_for_vendor (untuk reviewer lihat catatan sebelumnya)
5. Notify reviewer about resubmission
6. Invalidate caches
```

#### Security:
- ✅ Only VENDOR can call this endpoint
- ✅ Ownership verification (submission.user_id === session.user.id)
- ✅ Status validation (must be NEEDS_REVISION)
- ✅ Cannot resubmit APPROVED or REJECTED submissions

---

### **4. Vendor UI Updates**

**File:** `src/components/vendor/EditSubmissionForm.tsx`

#### Key Changes:

##### 4.1. Allow Edit for NEEDS_REVISION
```typescript
// ✅ BEFORE: Only PENDING_APPROVAL
if (submission.approval_status !== 'PENDING_APPROVAL') {
  // Cannot edit
}

// ✅ AFTER: Both PENDING_APPROVAL and NEEDS_REVISION
if (submission.approval_status !== 'PENDING_APPROVAL' && 
    submission.approval_status !== 'NEEDS_REVISION') {
  // Cannot edit
}
```

##### 4.2. Display Reviewer Notes
```tsx
{submission.approval_status === 'NEEDS_REVISION' && submission.note_for_vendor && (
  <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
    <h3 className="font-semibold text-orange-900 mb-2">📝 Catatan dari Reviewer:</h3>
    <div className="text-orange-800 text-sm whitespace-pre-wrap">
      {submission.note_for_vendor}
    </div>
    <p className="text-orange-700 text-sm mt-3 font-medium">
      Silakan perbaiki pengajuan sesuai catatan di atas, 
      lalu klik "Simpan Perubahan" untuk mengirim ulang ke reviewer.
    </p>
  </div>
)}
```

##### 4.3. Auto-Resubmit After Save
```typescript
// After successful update
if (submission.approval_status === 'NEEDS_REVISION') {
  // Call resubmit endpoint
  const resubmitResponse = await fetch(`/api/submissions/${submission.id}/resubmit`, {
    method: 'PATCH'
  });
  
  if (resubmitResponse.ok) {
    showSuccess('Berhasil!', 'Pengajuan telah diperbaiki dan dikirim ulang untuk direview!');
  }
}
```

##### 4.4. Dynamic Button Text
```tsx
<Button type="submit">
  {isLoading ? 'Menyimpan...' : 
   submission.approval_status === 'NEEDS_REVISION' ? 
   'Kirim Ulang Setelah Perbaikan' : 
   'Simpan Perubahan'}
</Button>
```

##### 4.5. Status Display
```tsx
Status: 
  PENDING_APPROVAL → "Menunggu Review" (yellow)
  NEEDS_REVISION → "Perlu Perbaikan" (orange)
  APPROVED → "Disetujui" (green)
  REJECTED → "Ditolak" (red)
```

---

### **5. Notification Updates**

**File:** `src/server/events.ts`

#### 5.1. Updated Vendor Notification (Revision Request)
```typescript
export async function notifyVendorSubmissionRejected(...) {
  // ✅ BEFORE
  title: 'Pengajuan Simlok Ditolak'
  message: 'Pengajuan Simlok Anda ditolak oleh ...'
  type: 'submission_rejected'
  
  // ✅ AFTER
  title: 'Pengajuan Simlok Perlu Diperbaiki'
  message: 'Pengajuan Simlok Anda perlu diperbaiki. ... Silakan perbaiki pengajuan Anda.'
  type: 'submission_needs_revision'
  data: {
    ...,
    action: 'Silakan edit dan kirim ulang pengajuan Anda setelah diperbaiki'
  }
}
```

#### 5.2. New Reviewer Notification (Resubmission)
```typescript
export async function notifyReviewerSubmissionResubmitted(
  submissionId: string,
  vendorName: string
) {
  title: 'Pengajuan Diperbaiki dan Dikirim Ulang'
  message: `${vendorName} telah memperbaiki dan mengirim ulang pengajuan Simlok. 
            Silakan review kembali.`
  type: 'submission_resubmitted'
  scope: 'reviewer'
  data: {
    submissionId,
    vendorName,
    previousNote: ...,  // Catatan reviewer sebelumnya
    resubmittedBy: vendorName
  }
}
```

---

### **6. Reviewer UI Updates**

**File:** `src/components/reviewer/ReviewerSubmissionDetailModal.tsx`

#### Key Changes:

##### 6.1. Added Status Types
```typescript
approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 
                 'NEEDS_REVISION' | 'PENDING_REVIEW';
```

##### 6.2. Status Badge Updates
```tsx
case 'PENDING_REVIEW':
  return <Badge color="yellow">Menunggu Review Ulang</Badge>;

case 'NEEDS_REVISION':
  return <Badge color="orange">Perlu Perbaikan Vendor</Badge>;

case 'PENDING_APPROVAL':
  return <Badge color="blue">Menunggu Persetujuan</Badge>;
```

##### 6.3. Display Context
- Reviewer can see `note_for_vendor` they previously wrote
- Can verify if vendor fixed the issues
- Can see submission has been resubmitted (via notification)

---

## 🎯 **Use Cases & Scenarios**

### **Scenario 1: Happy Path (Fixed on First Revision)**
```
1. Vendor: Submit pengajuan → PENDING_REVIEW
2. Reviewer: Review → NOT_MEETS_REQUIREMENTS
   - Note: "Foto pekerja kurang jelas, upload ulang dengan resolusi lebih tinggi"
   - Status: NEEDS_REVISION
3. Vendor: Notifikasi diterima
   - Buka edit form
   - Lihat catatan reviewer
   - Upload foto baru yang lebih jelas
   - Klik "Kirim Ulang Setelah Perbaikan"
   - Status: PENDING_REVIEW
4. Reviewer: Notifikasi "Pengajuan diperbaiki"
   - Review ulang
   - Foto sudah OK → MEETS_REQUIREMENTS
   - Status: PENDING_APPROVAL
5. Approver: Final approval → APPROVED
```

### **Scenario 2: Multiple Revisions**
```
1. Vendor: Submit → PENDING_REVIEW
2. Reviewer: NOT_MEETS_REQUIREMENTS → NEEDS_REVISION
   - Note: "Jam kerja tidak sesuai, dokumen SIMJA kurang"
3. Vendor: Fix jam kerja, upload SIMJA → Resubmit
   - Status: PENDING_REVIEW
4. Reviewer: Review ulang → Masih NOT_MEETS_REQUIREMENTS
   - Note: "SIMJA sudah OK, tapi lokasi kerja belum spesifik"
   - Status: NEEDS_REVISION lagi
5. Vendor: Perbaiki lokasi kerja → Resubmit lagi
   - Status: PENDING_REVIEW
6. Reviewer: Review ulang → MEETS_REQUIREMENTS
   - Status: PENDING_APPROVAL
7. Approver: APPROVED
```

### **Scenario 3: Final Rejection by Approver**
```
1. Reviewer: MEETS_REQUIREMENTS → PENDING_APPROVAL
2. Approver: Review dan tidak setuju
   - Set approval_status: REJECTED (final)
   - Vendor TIDAK BISA edit lagi
   - Harus buat pengajuan baru
```

---

## 📊 **Status Flow Diagram**

```
┌─────────────────┐
│ Vendor Submit   │
│ PENDING_REVIEW  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Reviewer Reviews    │
└──────┬──────────────┘
       │
       ├─── MEETS_REQUIREMENTS ────► PENDING_APPROVAL ────► Approver
       │
       └─── NOT_MEETS_REQUIREMENTS ────► NEEDS_REVISION
                                            │
                                            ▼
                                   ┌────────────────┐
                                   │ Vendor Edits   │
                                   │ & Resubmits    │
                                   └───────┬────────┘
                                           │
                                           ▼
                                   PENDING_REVIEW (review ulang)
```

---

## 🔒 **Security Considerations**

### **Authorization Checks:**
1. ✅ **Review Endpoint**: Only REVIEWER, ADMIN, SUPER_ADMIN
2. ✅ **Resubmit Endpoint**: Only VENDOR
3. ✅ **Ownership Verification**: submission.user_id === session.user.id
4. ✅ **Status Validation**: Must be NEEDS_REVISION to resubmit

### **Data Integrity:**
1. ✅ Previous `note_for_vendor` preserved after resubmit
2. ✅ Review data cleared on resubmit (reviewed_at, reviewed_by, note_for_approver)
3. ✅ Approval data only set by approver (not reviewer)

### **Audit Trail:**
1. ✅ Logs for revision requests
2. ✅ Logs for resubmissions
3. ✅ Notifications for all state changes
4. ✅ Cache invalidation on state changes

---

## 🧪 **Testing Checklist**

### **Unit Tests:**
- [ ] Review API sets NEEDS_REVISION correctly
- [ ] Resubmit API validates ownership
- [ ] Resubmit API validates status
- [ ] Notifications sent correctly

### **Integration Tests:**
- [ ] Full flow: Submit → Revision → Resubmit → Approve
- [ ] Multiple revisions cycle
- [ ] Reviewer sees previous notes
- [ ] Vendor receives correct notifications

### **UI Tests:**
- [ ] Vendor can edit NEEDS_REVISION submissions
- [ ] Revision notes displayed correctly
- [ ] Button text changes based on status
- [ ] Status badges show correct colors
- [ ] Form disabled for APPROVED/REJECTED

### **Edge Cases:**
- [ ] Resubmit with no changes (should work)
- [ ] Concurrent edits by vendor (last write wins)
- [ ] Reviewer changes note while vendor editing (vendor sees old note)
- [ ] Network failure during resubmit (retry mechanism)

---

## 📝 **API Endpoints Summary**

### **1. Review Submission**
```
PATCH /api/submissions/[id]/review
Authorization: REVIEWER, ADMIN, SUPER_ADMIN
Body: {
  review_status: 'NOT_MEETS_REQUIREMENTS',
  note_for_vendor: 'Catatan untuk vendor...'
}
Result: approval_status = 'NEEDS_REVISION'
```

### **2. Resubmit After Revision**
```
PATCH /api/submissions/[id]/resubmit
Authorization: VENDOR (owner only)
Body: {} (no body needed)
Result: 
  - review_status = 'PENDING_REVIEW'
  - approval_status = 'PENDING_APPROVAL'
  - Notification sent to reviewer
```

### **3. Update Submission**
```
PUT /api/submissions/[id]
Authorization: VENDOR (owner only)
Allowed if: approval_status in ['PENDING_APPROVAL', 'NEEDS_REVISION']
Body: { ...submission data }
Result: Submission updated, ready for resubmit
```

---

## 🎨 **UI Components Summary**

### **Vendor Dashboard**
- ✅ Edit button visible for NEEDS_REVISION submissions
- ✅ Orange badge for "Perlu Perbaikan" status
- ✅ Notification shows catatan reviewer

### **Vendor Edit Form**
- ✅ Orange alert box with reviewer notes
- ✅ All fields editable
- ✅ Submit button text: "Kirim Ulang Setelah Perbaikan"
- ✅ Auto-resubmit after save successful

### **Reviewer Modal**
- ✅ Yellow badge for "Menunggu Review Ulang" (resubmitted)
- ✅ Orange badge for "Perlu Perbaikan Vendor" (waiting vendor)
- ✅ Previous notes visible for context

---

## ⚡ **Performance Optimizations**

1. ✅ **Cache Invalidation**: 
   - REVIEWER_STATS cleared on review
   - VENDOR_STATS cleared on resubmit

2. ✅ **Database Queries**:
   - Single update query for resubmit
   - Includes for complete data fetch

3. ✅ **Notifications**:
   - Async/await for non-blocking
   - Redis pub/sub for real-time updates

---

## 📚 **Related Documentation**

- [QR_CODE_VALIDATION_IMPROVEMENT.md](./QR_CODE_VALIDATION_IMPROVEMENT.md) - QR code changes
- [FIX_DATERANGEPICKER_STATE_SYNC.md](./FIX_DATERANGEPICKER_STATE_SYNC.md) - DateRangePicker fixes
- [NOTIFICATION_ICONS_STANDARDIZATION.md](./NOTIFICATION_ICONS_STANDARDIZATION.md) - Notification system

---

## 🚀 **Deployment Notes**

### **Database Migration:**
```bash
npx prisma migrate deploy
```

### **Required Environment Variables:**
- No new environment variables needed
- Uses existing QR_SECURITY_SALT

### **Breaking Changes:**
- ❌ None - fully backward compatible
- ✅ Existing REJECTED submissions remain REJECTED
- ✅ New submissions use new flow

---

**Last Updated:** 14 November 2025  
**Version:** 1.0.0  
**Status:** ✅ IMPLEMENTED  
**TypeScript Compilation:** ✅ PASSED  
**Migration Status:** ✅ APPLIED
