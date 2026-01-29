# Analisis Duplikasi Component Submission

## 🔍 Temuan Duplikasi

### 1. **SubmissionDetailModal (3,626 baris total!)**

**3 file terpisah dengan fungsi sangat mirip:**
- `VendorSubmissionDetailModal.tsx` - 485 baris
- `ReviewerSubmissionDetailModal.tsx` - 1,845 baris  
- `ApproverSubmissionDetailModal.tsx` - 1,296 baris

**Komponen yang sama di ketiga file:**
- ✅ Modal wrapper dengan escape handling
- ✅ formatDate() helper
- ✅ formatWorkLocation() helper
- ✅ Document preview modal (SimlokPdfModal, DocumentPreviewModal)
- ✅ DetailSection untuk info submission
- ✅ InfoCard untuk menampilkan data
- ✅ Badge untuk status
- ✅ WorkersList / Worker photos display
- ✅ SupportDocumentsSection
- ✅ TabNavigation (details, workers, actions)
- ✅ SubmissionStatusCards

**Yang berbeda (hanya actions):**
- Vendor: Hanya view, no actions
- Reviewer: Review actions (approve/reject dengan notes)
- Approver: Approval actions (approve/reject dengan implementation dates + QR scan history)

**Estimasi penghematan:** ~2,500 baris kode bisa dikurangi!

---

### 2. **UnifiedSubmissionForm (2,060 baris - TERLALU BESAR!)**

**Masalah:**
- Single file dengan 2,060 baris kode
- Menangani create dan edit mode dalam satu component
- Banyak state management yang kompleks
- Worker management yang besar
- Document upload management
- Draft persistence (create mode)
- Validation logic

**Bisa di-refactor menjadi:**
1. **Hooks:**
   - `useWorkerManagement()` - Worker CRUD operations
   - `useDocumentUpload()` - Document handling
   - `useDraftPersistence()` - Draft save/load
   - `useSubmissionValidation()` - Validation rules

2. **Sub-components:**
   - `SubmissionFormHeader` - Title, mode indicator
   - `SubmissionBasicInfo` - Vendor name, officer, etc
   - `ImplementationSection` - Dates, hours, location
   - `WorkersSection` - Worker list management
   - `DocumentsSection` - Document uploads
   - `FormActions` - Submit, save draft, cancel buttons

**Estimasi penghematan:** ~1,200 baris dengan hooks dan sub-components

---

### 3. **Submission Tables**

Sudah ada `UnifiedSubmissionTable.tsx` (245 baris) dan `SubmissionTable.tsx` (370 baris)

**Potensi duplikasi:** Perlu diverifikasi apakah masih ada duplikasi

---

## 💡 Rekomendasi Refactoring

### Priority 1: UnifiedSubmissionDetailModal ⭐⭐⭐

**Pendekatan:**
```tsx
// Unified modal dengan role-based actions
<UnifiedSubmissionDetailModal
  submission={submission}
  role="reviewer" // or "approver" or "vendor"
  isOpen={isOpen}
  onClose={onClose}
  actions={roleActions} // Role-specific action configs
/>
```

**Actions config:**
```tsx
// ReviewerActions.tsx
const reviewerActions = {
  tabs: ['details', 'workers', 'review'],
  primaryAction: {
    label: 'Approve Review',
    handler: handleApprove
  },
  secondaryAction: {
    label: 'Reject',
    handler: handleReject
  }
}
```

**Struktur baru:**
```
components/features/submission/
├── UnifiedSubmissionDetailModal.tsx        # 500-600 baris (main)
├── detail/
│   ├── DetailsTab.tsx                      # 200 baris
│   ├── WorkersTab.tsx                      # 200 baris
│   ├── ScanHistoryTab.tsx                  # 150 baris
│   └── actions/
│       ├── VendorActions.tsx               # 50 baris
│       ├── ReviewerActions.tsx             # 300 baris
│       └── ApproverActions.tsx             # 350 baris
└── hooks/
    └── useSubmissionDetail.ts              # 150 baris
```

**Penghematan:** 3,626 → ~1,900 baris = **1,726 baris dikurangi!**

---

### Priority 2: Refactor UnifiedSubmissionForm ⭐⭐

**Custom Hooks:**
```tsx
// hooks/useWorkerManagement.ts (200 baris)
export function useWorkerManagement(initialWorkers) {
  const [workers, setWorkers] = useState(initialWorkers);
  const addWorker = () => { ... };
  const removeWorker = (id) => { ... };
  const updateWorker = (id, field, value) => { ... };
  return { workers, addWorker, removeWorker, updateWorker };
}

// hooks/useDocumentUpload.ts (150 baris)
export function useDocumentUpload() {
  const [documents, setDocuments] = useState({});
  const handleUpload = async (category, file) => { ... };
  const handleRemove = (category, index) => { ... };
  return { documents, handleUpload, handleRemove };
}

// hooks/useDraftPersistence.ts (100 baris)
export function useDraftPersistence(formData, mode) {
  useEffect(() => {
    if (mode === 'create') saveDraft(formData);
  }, [formData]);
  const loadDraft = () => { ... };
  const deleteDraft = () => { ... };
  return { loadDraft, deleteDraft };
}
```

**Sub-components:**
```tsx
// form/SubmissionBasicInfo.tsx (150 baris)
export function SubmissionBasicInfo({ formData, onChange }) {
  return (
    <Card>
      <Input label="Vendor Name" ... />
      <Input label="Officer Name" ... />
    </Card>
  );
}

// form/ImplementationSection.tsx (250 barias)
export function ImplementationSection({ formData, onChange }) {
  return (
    <Card>
      <DateRangePicker ... />
      <TimeRangePicker ... />
      <Input label="Work Location" ... />
    </Card>
  );
}

// form/WorkersManagementSection.tsx (350 baris)
export function WorkersManagementSection({ workers, onUpdate }) {
  const { addWorker, removeWorker, updateWorker } = useWorkerManagement(workers);
  return <Card>...</Card>;
}

// form/DocumentsUploadSection.tsx (300 baris)
export function DocumentsUploadSection({ documents, onUpdate }) {
  return <Card>...</Card>;
}
```

**Struktur baru:**
```
components/features/submission/
├── UnifiedSubmissionForm.tsx               # 400 baris (main orchestrator)
├── form/
│   ├── SubmissionBasicInfo.tsx             # 150 baris
│   ├── ImplementationSection.tsx           # 250 baris
│   ├── WorkersManagementSection.tsx        # 350 baris
│   └── DocumentsUploadSection.tsx          # 300 baris
└── hooks/
    ├── useWorkerManagement.ts              # 200 baris
    ├── useDocumentUpload.ts                # 150 baris
    ├── useDraftPersistence.ts              # 100 baris
    └── useSubmissionValidation.ts          # 160 baris
```

**Penghematan:** 2,060 → ~1,910 baris = **150 baris dikurangi** (lebih maintainable!)

---

## 📊 Total Impact

**Before:**
- 3 DetailModals: 3,626 baris
- UnifiedSubmissionForm: 2,060 baris
- **Total: 5,686 baris**

**After (Estimated):**
- UnifiedSubmissionDetailModal + role actions: ~1,900 baris
- UnifiedSubmissionForm (refactored): ~1,910 baris
- **Total: ~3,810 baris**

**Penghematan: ~1,876 baris kode (33% reduction)** ✨

**Benefits:**
- ✅ Maintainability lebih baik (separation of concerns)
- ✅ Reusability meningkat
- ✅ Testing lebih mudah (smaller units)
- ✅ Bug fixes di satu tempat
- ✅ Consistent behavior across roles
- ✅ Easier to add new roles

---

## 🎯 Action Items

1. **Phase 1:** Create UnifiedSubmissionDetailModal
   - Extract shared components (tabs, status cards, etc)
   - Create role-based action configs
   - Migrate VendorDetailModal first (simplest)
   - Then ReviewerDetailModal
   - Finally ApproverDetailModal

2. **Phase 2:** Refactor UnifiedSubmissionForm
   - Extract custom hooks
   - Create sub-components
   - Update import references

3. **Phase 3:** Testing & Verification
   - Test all roles (vendor, reviewer, approver)
   - Verify all actions work
   - Check SSE notifications still work
