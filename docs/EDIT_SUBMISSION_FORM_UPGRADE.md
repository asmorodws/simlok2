# Edit Submission Form - Upgrade ke Format Lengkap

## Ringkasan Perubahan

`EditSubmissionForm` perlu diupgrade agar memiliki fitur yang sama lengkapnya dengan `SubmissionForm`, terutama untuk mendukung alur **NEEDS_REVISION** dimana vendor harus memperbaiki data pengajuan berdasarkan `note_for_vendor` dari reviewer.

## Fitur yang Ditambahkan

### 1. **Support Documents (Dokumen Pendukung)**
- SIMJA Documents (multiple, wajib)
- SIKA Documents (multiple, wajib)
- Work Order Documents (optional)
- Kontrak Kerja Documents (optional)
- JSA Documents (optional)

Menggunakan komponen `SupportDocumentList` yang sudah ada.

### 2. **HSSE Pass untuk Setiap Pekerja**
Setiap pekerja harus memiliki:
- Nomor HSSE Pass
- Tanggal Berlaku HSSE Pass
- Dokumen Upload HSSE Pass

### 3. **DateRangePicker untuk Implementasi**
- Menggunakan `DateRangePicker` bukan 2 input terpisah
- Auto-detect weekend untuk conditional holiday working hours

### 4. **Vendor Phone Number**
- Field untuk nomor telepon vendor

### 5. **Validasi Lengkap**
- Validasi dokumen SIMJA minimal 1
- Validasi dokumen SIKA minimal 1
- Validasi HSSE Pass semua pekerja
- Validasi tanggal pelaksanaan
- Conditional validation untuk holiday working hours jika ada weekend

## Struktur Interface yang Diperbarui

```typescript
interface Worker {
  id: string;
  worker_name: string;
  worker_photo: string;
  hsse_pass_number?: string;
  hsse_pass_valid_thru?: string;
  hsse_pass_document_upload?: string;
}

interface SupportDoc {
  id: string;
  document_subtype?: string;
  document_number: string;
  document_date: string;
  document_upload: string;
}
```

## State yang Ditambahkan

```typescript
// Support Documents
const [simjaDocuments, setSimjaDocuments] = useState<SupportDoc[]>([...]);
const [sikaDocuments, setSikaDocuments] = useState<SupportDoc[]>([...]);
const [workOrderDocuments, setWorkOrderDocuments] = useState<SupportDoc[]>([...]);
const [kontrakKerjaDocuments, setKontrakKerjaDocuments] = useState<SupportDoc[]>([...]);
const [jsaDocuments, setJsaDocuments] = useState<SupportDoc[]>([...]);

// Optional Documents Management
const [visibleOptionalDocs, setVisibleOptionalDocs] = useState<Set<string>>(new Set());
const [selectedOptionalDoc, setSelectedOptionalDoc] = useState<string>('');

// Invalid Documents Tracking
const [invalidDocuments, setInvalidDocuments] = useState<Map<string, string>>(new Map());

// Prevent Double Submission
const isSubmittingRef = useRef(false);
```

## Handlers yang Ditambahkan

```typescript
// HSSE Pass Handlers
const updateWorkerHsseNumber = (id: string, value: string) => { ... };
const updateWorkerHsseValidThru = (id: string, value: string) => { ... };
const updateWorkerHsseDocument = (id: string, url: string) => { ... };

// Optional Documents Handlers
const addOptionalDocument = () => { ... };
const removeOptionalDocument = (documentType: string) => { ... };

// Holiday Time Handler
const handleHolidayTimeChange = (value: string) => { ... };
```

## Validasi dalam handleSubmit

### 1. Validasi Tanggal Pelaksanaan
```typescript
if (!implementationDates.startDate?.trim()) {
  showError('Tanggal Pelaksanaan Tidak Lengkap', 'Tanggal Mulai Pelaksanaan wajib diisi.');
  return;
}

if (!implementationDates.endDate?.trim()) {
  showError('Tanggal Pelaksanaan Tidak Lengkap', 'Tanggal Selesai Pelaksanaan wajib diisi.');
  return;
}

// Validasi tanggal selesai >= tanggal mulai
const startDate = new Date(implementationDates.startDate);
const endDate = new Date(implementationDates.endDate);
if (endDate < startDate) {
  showError('Tanggal Tidak Valid', 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
  return;
}
```

### 2. Validasi Jam Kerja Hari Libur (Conditional)
```typescript
if (hasWeekend && !formData.jam_kerja_libur?.trim()) {
  showError('Jam Kerja Hari Libur Wajib', 'Rentang tanggal mencakup Sabtu/Minggu. Silakan isi Jam Kerja Hari Libur.');
  return;
}
```

### 3. Validasi Dokumen SIMJA
```typescript
const filledSimjaDocs = simjaDocuments.filter(doc =>
  doc && (doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim())
);

if (filledSimjaDocs.length === 0) {
  showError('Dokumen SIMJA Wajib', 'Minimal harus ada 1 dokumen SIMJA yang lengkap.');
  return;
}

// Validasi setiap dokumen SIMJA yang terisi
for (let i = 0; i < simjaDocuments.length; i++) {
  const doc = simjaDocuments[i];
  if (!doc) continue;

  const hasData = doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim();
  
  if (hasData) {
    const missingFields = [];
    if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
    if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
    if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');

    if (missingFields.length > 0) {
      showError('Dokumen SIMJA Tidak Lengkap', `SIMJA #${i + 1}: ${missingFields.join(', ')} belum diisi.`);
      return;
    }
  }
}
```

### 4. Validasi Dokumen SIKA (sama seperti SIMJA)

### 5. Validasi HSSE Pass untuk Setiap Pekerja
```typescript
for (let i = 0; i < workers.length; i++) {
  const worker = workers[i];
  if (!worker) continue;

  const missingFields = [];
  
  if (!worker.worker_name?.trim()) missingFields.push('Nama Pekerja');
  if (!worker.worker_photo?.trim()) missingFields.push('Foto Pekerja');
  if (!worker.hsse_pass_number?.trim()) missingFields.push('Nomor HSSE Pass');
  if (!worker.hsse_pass_valid_thru?.trim()) missingFields.push('Tanggal Berlaku HSSE Pass');
  if (!worker.hsse_pass_document_upload?.trim()) missingFields.push('Dokumen HSSE Pass');

  if (missingFields.length > 0) {
    showError('Data Pekerja Tidak Lengkap', 
      `Pekerja ${i + 1}: ${missingFields.join(', ')} belum diisi. Semua field wajib diisi.`);
    return;
  }
}
```

## Payload Update API

```typescript
const payload = {
  vendor_name: formData.nama_vendor,
  vendor_phone: formData.vendor_phone, // BARU
  officer_name: formData.nama_petugas,
  job_description: formData.pekerjaan,
  work_location: formData.lokasi_kerja,
  implementation_start_date: implementationDates.startDate,
  implementation_end_date: implementationDates.endDate,
  working_hours: formData.jam_kerja,
  holiday_working_hours: formData.jam_kerja_libur || null,
  work_facilities: formData.sarana_kerja,
  worker_count: workers.length,
  worker_names: workers.map(w => w.worker_name.trim()).join('\n'),
  
  // Workers dengan HSSE Pass
  workers: workers.map(worker => ({
    worker_name: worker.worker_name.trim(),
    worker_photo: worker.worker_photo,
    hsse_pass_number: worker.hsse_pass_number?.trim(),
    hsse_pass_valid_thru: worker.hsse_pass_valid_thru,
    hsse_pass_document_upload: worker.hsse_pass_document_upload
  })),
  
  // Support Documents
  simjaDocuments: validSimjaDocuments,
  sikaDocuments: validSikaDocuments,
  workOrderDocuments: validWorkOrderDocuments,
  kontrakKerjaDocuments: validKontrakKerjaDocuments,
  jsaDocuments: validJsaDocuments
};
```

## UI Components yang Perlu Ditambahkan

### 1. Section Dokumen Pendukung
```tsx
<div className="p-6 rounded-lg space-y-8">
  <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">
    Dokumen Pendukung
  </h2>

  {/* SIMJA Documents */}
  <div className="border border-gray-200 p-6 rounded-lg bg-white">
    <SupportDocumentList
      title="Dokumen SIMJA"
      documentType="SIMJA"
      documents={simjaDocuments}
      onDocumentsChange={setSimjaDocuments}
      disabled={isLoading}
      invalidDocumentIds={invalidDocuments}
    />
  </div>

  {/* SIKA Documents */}
  <div className="border border-gray-200 p-6 rounded-lg bg-white">
    <SupportDocumentList
      title="Dokumen SIKA"
      documentType="SIKA"
      documents={sikaDocuments}
      onDocumentsChange={setSikaDocuments}
      disabled={isLoading}
      invalidDocumentIds={invalidDocuments}
    />
  </div>

  {/* Add Optional Document Selector */}
  <div className="border border-gray-200 p-6 rounded-lg bg-blue-50">
    <h3 className="text-base font-semibold text-gray-900 mb-4">Tambah Dokumen Opsional</h3>
    <div className="flex gap-3 items-end">
      <div className="flex-1">
        <Label htmlFor="optional_doc_select">Pilih Jenis Dokumen</Label>
        <select
          id="optional_doc_select"
          value={selectedOptionalDoc}
          onChange={(e) => setSelectedOptionalDoc(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={isLoading || submission.approval_status !== 'NEEDS_REVISION'}
        >
          <option value="">-- Pilih Dokumen Opsional --</option>
          <option value="WORK_ORDER" disabled={visibleOptionalDocs.has('WORK_ORDER')}>
            Work Order {visibleOptionalDocs.has('WORK_ORDER') ? '(Sudah ditambahkan)' : ''}
          </option>
          <option value="KONTRAK_KERJA" disabled={visibleOptionalDocs.has('KONTRAK_KERJA')}>
            Kontrak Kerja {visibleOptionalDocs.has('KONTRAK_KERJA') ? '(Sudah ditambahkan)' : ''}
          </option>
          <option value="JSA" disabled={visibleOptionalDocs.has('JSA')}>
            JSA {visibleOptionalDocs.has('JSA') ? '(Sudah ditambahkan)' : ''}
          </option>
        </select>
      </div>
      <Button
        type="button"
        onClick={addOptionalDocument}
        disabled={!selectedOptionalDoc || isLoading}
      >
        + Tambah Dokumen
      </Button>
    </div>
  </div>

  {/* Conditional Optional Documents */}
  {visibleOptionalDocs.has('WORK_ORDER') && (
    <div className="border border-gray-200 p-6 rounded-lg bg-white">
      <div className="mb-4 flex justify-between items-center">
        <Badge variant="warning">Dokumen Work Order (Opsional)</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => removeOptionalDocument('WORK_ORDER')}
          disabled={isLoading}
        >
          Hapus
        </Button>
      </div>
      <SupportDocumentList
        title="Dokumen Work Order"
        documentType="WORK_ORDER"
        documents={workOrderDocuments}
        onDocumentsChange={setWorkOrderDocuments}
        disabled={isLoading}
        invalidDocumentIds={invalidDocuments}
      />
    </div>
  )}

  {/* Similar for KONTRAK_KERJA and JSA */}
</div>
```

### 2. Update Worker Card dengan HSSE Pass
```tsx
<div key={worker.id} className="border-2 border-gray-200 rounded-xl p-4">
  {/* ...existing worker fields... */}
  
  {/* HSSE Pass Section */}
  <div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
    <h4 className="text-sm font-semibold text-gray-700">HSSE Pass</h4>
    
    <div>
      <Label htmlFor={`hsse_number_${worker.id}`}>Nomor HSSE Pass <span className="text-red-500">*</span></Label>
      <Input
        id={`hsse_number_${worker.id}`}
        value={worker.hsse_pass_number || ''}
        onChange={(e) => updateWorkerHsseNumber(worker.id, e.target.value)}
        placeholder="Contoh: 2024/V/001"
        required
      />
    </div>
    
    <div>
      <Label htmlFor={`hsse_valid_${worker.id}`}>Berlaku Hingga <span className="text-red-500">*</span></Label>
      <DatePicker
        id={`hsse_valid_${worker.id}`}
        value={worker.hsse_pass_valid_thru || ''}
        onChange={(value) => updateWorkerHsseValidThru(worker.id, value)}
        required
      />
    </div>
    
    <div>
      <Label>Dokumen HSSE Pass <span className="text-red-500">*</span></Label>
      <FileUpload
        id={`hsse_doc_${worker.id}`}
        value={worker.hsse_pass_document_upload || ''}
        onChange={(url) => updateWorkerHsseDocument(worker.id, url)}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSize={8}
        required
      />
    </div>
  </div>
</div>
```

### 3. DateRangePicker untuk Pelaksanaan
```tsx
<div>
  <Label htmlFor="implementation_dates">
    Tanggal Pelaksanaan <span className="text-red-500">*</span>
  </Label>
  <DateRangePicker
    startDate={implementationDates.startDate}
    endDate={implementationDates.endDate}
    onStartDateChange={(value) =>
      setImplementationDates(prev => ({ ...prev, startDate: value }))
    }
    onEndDateChange={(value) =>
      setImplementationDates(prev => ({ ...prev, endDate: value }))
    }
  />
</div>

{/* Conditional Holiday Working Hours */}
{hasWeekend && (
  <div>
    <Label htmlFor="jam_kerja_libur">
      Jam Kerja Hari Libur (Sabtu/Minggu)
      <span className="text-red-500">*</span>
    </Label>
    <TimeRangePicker
      id="jam_kerja_libur"
      value={formData.jam_kerja_libur || ''}
      onChange={handleHolidayTimeChange}
      required
    />
  </div>
)}
```

## Checklist Implementasi

- [x] Import komponen yang diperlukan (DateRangePicker, SupportDocumentList, Badge)
- [x] Update interface Worker dengan HSSE Pass fields
- [x] Tambahkan state untuk support documents
- [x] Tambahkan state untuk optional documents management
- [x] Tambahkan handlers untuk HSSE Pass
- [x] Tambahkan handlers untuk optional documents
- [ ] Update fetchSubmission untuk load support documents
- [ ] Update handleSubmit dengan validasi lengkap
- [ ] Update UI dengan section Dokumen Pendukung
- [ ] Update UI worker card dengan HSSE Pass fields
- [ ] Update UI dengan DateRangePicker
- [ ] Tambahkan vendor phone field
- [ ] Test end-to-end edit submission flow

## Testing

Setelah implementasi lengkap, test scenario:

1. **Edit pengajuan dengan status NEEDS_REVISION**
   - Buka notifikasi vendor
   - Klik link edit dari note_for_vendor
   - Pastikan semua data dimuat dengan benar
   - Perbaiki sesuai catatan reviewer
   - Submit dan pastikan status berubah ke PENDING_REVIEW

2. **Validasi form**
   - Test validasi dokumen SIMJA/SIKA minimal 1
   - Test validasi HSSE Pass semua pekerja
   - Test validasi tanggal pelaksanaan
   - Test conditional holiday hours jika ada weekend

3. **Support documents**
   - Test upload multiple SIMJA
   - Test upload multiple SIKA
   - Test tambah/hapus optional documents
   - Test validasi dokumen tidak lengkap

## Status: IN PROGRESS

Perubahan sudah dimulai pada:
- ✅ Import statements
- ✅ Interface definitions
- ✅ State initialization
- ✅ fetchSubmission untuk load support documents
- ✅ Handlers untuk HSSE Pass dan optional docs
- ⏳ handleSubmit validation (perlu dilengkapi)
- ⏳ UI components (perlu ditambahkan)
