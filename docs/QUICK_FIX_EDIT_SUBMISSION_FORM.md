# Quick Fix: EditSubmissionForm - Perubahan Minimal yang Diperlukan

## Status Saat Ini

File `EditSubmissionForm.tsx` sudah diupdate dengan:
- ✅ Import `DateRangePicker`, `SupportDocumentList`, `Badge`
- ✅ Interface `Worker` sudah include HSSE Pass fields
- ✅ State untuk support documents (simjaDocuments, sikaDocuments, dll)
- ✅ State untuk optional documents management
- ✅ Handlers untuk HSSE Pass (updateWorkerHsseNumber, etc)
- ✅ Handlers untuk optional documents (addOptionalDocument, removeOptionalDocument)
- ✅ Load support documents dari API dalam useEffect

## Yang Masih Perlu Dilakukan

### 1. Update handleSubmit (CRITICAL)

Ganti bagian validasi di `handleSubmit` mulai dari baris ~507 hingga pengiriman data.

**FIND:**
```typescript
    // Client-side validation
    const requiredFields = [
      'nama_vendor', 'berdasarkan', 'nama_petugas', 'pekerjaan', 
      'lokasi_kerja', 'jam_kerja', 'sarana_kerja', 'nama_pekerja'
    ];

    for (const field of requiredFields) {
      const value = formData[field as keyof typeof formData];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        setAlert({
          variant: 'error',
          title: 'Error!',
          message: `Field ${field} harus diisi!`
        });
        return;
      }
    }
```

**REPLACE WITH:**
```typescript
    // PREVENT DOUBLE SUBMISSION
    if (isSubmittingRef.current) {
      console.warn('⚠️ Submission already in progress');
      return;
    }
    isSubmittingRef.current = true;
    
    const resetSubmission = () => {
      isSubmittingRef.current = false;
      setIsLoading(false);
    };
    
    // ========== VALIDASI TANGGAL PELAKSANAAN ==========
    if (!implementationDates.startDate?.trim()) {
      showError('Tanggal Pelaksanaan Tidak Lengkap', 'Tanggal Mulai Pelaksanaan wajib diisi.');
      resetSubmission();
      return;
    }

    if (!implementationDates.endDate?.trim()) {
      showError('Tanggal Pelaksanaan Tidak Lengkap', 'Tanggal Selesai Pelaksanaan wajib diisi.');
      resetSubmission();
      return;
    }

    const startDate = new Date(implementationDates.startDate);
    const endDate = new Date(implementationDates.endDate);

    if (endDate < startDate) {
      showError('Tanggal Tidak Valid', 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      resetSubmission();
      return;
    }

    // ========== VALIDASI JAM KERJA HARI LIBUR (CONDITIONAL) ==========
    if (hasWeekend && !formData.jam_kerja_libur?.trim()) {
      showError('Jam Kerja Hari Libur Wajib', 'Rentang tanggal mencakup Sabtu/Minggu. Silakan isi Jam Kerja Hari Libur.');
      resetSubmission();
      return;
    }

    // ========== VALIDASI DOKUMEN SIMJA ==========
    const filledSimjaDocs = simjaDocuments.filter(doc =>
      doc && (doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim())
    );

    if (filledSimjaDocs.length === 0) {
      showError('Dokumen SIMJA Wajib', 'Minimal harus ada 1 dokumen SIMJA yang lengkap.');
      resetSubmission();
      return;
    }

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
          resetSubmission();
          return;
        }
      }
    }

    // ========== VALIDASI DOKUMEN SIKA ==========
    const filledSikaDocs = sikaDocuments.filter(doc =>
      doc && (doc.document_subtype?.trim() || doc.document_number?.trim() ||
        doc.document_date?.trim() || doc.document_upload?.trim())
    );

    if (filledSikaDocs.length === 0) {
      showError('Dokumen SIKA Wajib', 'Minimal harus ada 1 dokumen SIKA yang lengkap.');
      resetSubmission();
      return;
    }

    for (let i = 0; i < sikaDocuments.length; i++) {
      const doc = sikaDocuments[i];
      if (!doc) continue;

      const hasData = doc.document_subtype?.trim() || doc.document_number?.trim() ||
        doc.document_date?.trim() || doc.document_upload?.trim();

      if (hasData) {
        const missingFields = [];
        if (!doc.document_subtype?.trim()) missingFields.push('Jenis SIKA');
        if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
        if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
        if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');

        if (missingFields.length > 0) {
          showError('Dokumen SIKA Tidak Lengkap', `SIKA #${i + 1}: ${missingFields.join(', ')} belum diisi.`);
          resetSubmission();
          return;
        }
      }
    }

    // ========== VALIDASI DOKUMEN OPSIONAL ==========
    // Work Order
    for (let i = 0; i < workOrderDocuments.length; i++) {
      const doc = workOrderDocuments[i];
      if (!doc) continue;
      const hasData = doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim();
      if (hasData) {
        const missingFields = [];
        if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
        if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
        if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');
        if (missingFields.length > 0) {
          showError('Dokumen Work Order Tidak Lengkap', `Work Order #${i + 1}: ${missingFields.join(', ')} belum diisi.`);
          resetSubmission();
          return;
        }
      }
    }

    // Kontrak Kerja
    for (let i = 0; i < kontrakKerjaDocuments.length; i++) {
      const doc = kontrakKerjaDocuments[i];
      if (!doc) continue;
      const hasData = doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim();
      if (hasData) {
        const missingFields = [];
        if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
        if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
        if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');
        if (missingFields.length > 0) {
          showError('Dokumen Kontrak Kerja Tidak Lengkap', `Kontrak Kerja #${i + 1}: ${missingFields.join(', ')} belum diisi.`);
          resetSubmission();
          return;
        }
      }
    }

    // JSA
    for (let i = 0; i < jsaDocuments.length; i++) {
      const doc = jsaDocuments[i];
      if (!doc) continue;
      const hasData = doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim();
      if (hasData) {
        const missingFields = [];
        if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
        if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
        if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');
        if (missingFields.length > 0) {
          showError('Dokumen JSA Tidak Lengkap', `JSA #${i + 1}: ${missingFields.join(', ')} belum diisi.`);
          resetSubmission();
          return;
        }
      }
    }
```

**LANJUTKAN DENGAN VALIDASI WORKERS:**
```typescript
    // ========== VALIDASI WORKERS ==========
    if (workers.length === 0) {
      showError('Data Pekerja Tidak Lengkap', 'Minimal harus ada satu pekerja.');
      resetSubmission();
      return;
    }

    // Validasi data pekerja dan HSSE Pass (semuanya wajib)
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
          `Pekerja ${i + 1} (${worker.worker_name || 'Tanpa Nama'}): ${missingFields.join(', ')} belum diisi.`);
        resetSubmission();
        return;
      }
    }

    const workerNames = workers.map((w) => w.worker_name.trim()).join('\n');

    // Filter valid documents
    const validSimjaDocuments = simjaDocuments.filter(doc =>
      doc.document_number?.trim() &&
      doc.document_date?.trim() &&
      doc.document_upload?.trim()
    );

    const validSikaDocuments = sikaDocuments.filter(doc =>
      doc.document_subtype?.trim() &&
      doc.document_number?.trim() &&
      doc.document_date?.trim() &&
      doc.document_upload?.trim()
    );

    const validWorkOrderDocuments = workOrderDocuments.filter(doc =>
      doc.document_number?.trim() &&
      doc.document_date?.trim() &&
      doc.document_upload?.trim()
    );

    const validKontrakKerjaDocuments = kontrakKerjaDocuments.filter(doc =>
      doc.document_number?.trim() &&
      doc.document_date?.trim() &&
      doc.document_upload?.trim()
    );

    const validJsaDocuments = jsaDocuments.filter(doc =>
      doc.document_number?.trim() &&
      doc.document_date?.trim() &&
      doc.document_upload?.trim()
    );

    // Prepare payload
    const payload = {
      vendor_name: formData.nama_vendor,
      officer_name: formData.nama_petugas,
      job_description: formData.pekerjaan,
      work_location: formData.lokasi_kerja,
      implementation_start_date: implementationDates.startDate,
      implementation_end_date: implementationDates.endDate,
      working_hours: formData.jam_kerja,
      holiday_working_hours: formData.jam_kerja_libur || null,
      work_facilities: formData.sarana_kerja,
      worker_count: workers.length,
      worker_names: workerNames,
      workers: workers.map(worker => ({
        worker_name: worker.worker_name.trim(),
        worker_photo: worker.worker_photo,
        hsse_pass_number: worker.hsse_pass_number?.trim(),
        hsse_pass_valid_thru: worker.hsse_pass_valid_thru,
        hsse_pass_document_upload: worker.hsse_pass_document_upload
      })),
      simjaDocuments: validSimjaDocuments,
      sikaDocuments: validSikaDocuments,
      workOrderDocuments: validWorkOrderDocuments,
      kontrakKerjaDocuments: validKontrakKerjaDocuments,
      jsaDocuments: validJsaDocuments
    };
```

### 2. Update UI - Tambahkan Section Dokumen Pendukung

**CARI bagian form setelah Informasi Vendor (sekitar baris 700-800):**

**TAMBAHKAN SEBELUM "Informasi Pekerjaan":**
```tsx
{/* ================= Dokumen Pendukung ================= */}
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
      disabled={isLoading || (submission.approval_status !== 'PENDING_APPROVAL' && submission.approval_status !== 'NEEDS_REVISION')}
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
      disabled={isLoading || (submission.approval_status !== 'PENDING_APPROVAL' && submission.approval_status !== 'NEEDS_REVISION')}
      invalidDocumentIds={invalidDocuments}
    />
  </div>

  {/* Add Optional Document Selector */}
  {(submission.approval_status === 'PENDING_APPROVAL' || submission.approval_status === 'NEEDS_REVISION') && (
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
            disabled={isLoading}
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
  )}

  {/* Work Order Documents */}
  {visibleOptionalDocs.has('WORK_ORDER') && (
    <div className="border border-gray-200 p-6 rounded-lg bg-white">
      <div className="mb-4 flex justify-between items-center">
        <Badge variant="warning">Dokumen Work Order (Opsional)</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200"
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

  {/* Kontrak Kerja Documents */}
  {visibleOptionalDocs.has('KONTRAK_KERJA') && (
    <div className="border border-gray-200 p-6 rounded-lg bg-white">
      <div className="mb-4 flex justify-between items-center">
        <Badge variant="warning">Dokumen Kontrak Kerja (Opsional)</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200"
          onClick={() => removeOptionalDocument('KONTRAK_KERJA')}
          disabled={isLoading}
        >
          Hapus
        </Button>
      </div>
      <SupportDocumentList
        title="Dokumen Kontrak Kerja"
        documentType="KONTRAK_KERJA"
        documents={kontrakKerjaDocuments}
        onDocumentsChange={setKontrakKerjaDocuments}
        disabled={isLoading}
        invalidDocumentIds={invalidDocuments}
      />
    </div>
  )}

  {/* JSA Documents */}
  {visibleOptionalDocs.has('JSA') && (
    <div className="border border-gray-200 p-6 rounded-lg bg-white">
      <div className="mb-4 flex justify-between items-center">
        <Badge variant="warning">Dokumen JSA (Opsional)</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200"
          onClick={() => removeOptionalDocument('JSA')}
          disabled={isLoading}
        >
          Hapus
        </Button>
      </div>
      <SupportDocumentList
        title="Dokumen Job Safety Analysis"
        documentType="JSA"
        documents={jsaDocuments}
        onDocumentsChange={setJsaDocuments}
        disabled={isLoading}
        invalidDocumentIds={invalidDocuments}
      />
    </div>
  )}
</div>
```

### 3. Update Worker Card - Tambahkan HSSE Pass Fields

**CARI di dalam worker map (sekitar baris 900-1000):**

**TAMBAHKAN SEBELUM closing div worker card:**
```tsx
{/* HSSE Pass Section */}
<div className="mt-4 space-y-3 pt-4 border-t border-gray-200">
  <h4 className="text-sm font-semibold text-gray-700">HSSE Pass <span className="text-red-500">*</span></h4>
  
  <div>
    <Label htmlFor={`hsse_number_${worker.id}`}>Nomor HSSE Pass</Label>
    <Input
      id={`hsse_number_${worker.id}`}
      value={worker.hsse_pass_number || ''}
      onChange={(e) => updateWorkerHsseNumber(worker.id, e.target.value)}
      placeholder="Contoh: 2024/V/001"
      required
      disabled={submission.approval_status !== 'PENDING_APPROVAL' && submission.approval_status !== 'NEEDS_REVISION'}
    />
  </div>
  
  <div>
    <Label htmlFor={`hsse_valid_${worker.id}`}>Berlaku Hingga</Label>
    <DatePicker
      id={`hsse_valid_${worker.id}`}
      value={worker.hsse_pass_valid_thru || ''}
      onChange={(value) => updateWorkerHsseValidThru(worker.id, value)}
      required
      disabled={submission.approval_status !== 'PENDING_APPROVAL' && submission.approval_status !== 'NEEDS_REVISION'}
    />
  </div>
  
  <div>
    <Label>Dokumen HSSE Pass</Label>
    <FileUpload
      id={`hsse_doc_${worker.id}`}
      label=""
      description="Upload dokumen HSSE Pass (PDF/Image max 8MB)"
      value={worker.hsse_pass_document_upload || ''}
      onChange={(url) => updateWorkerHsseDocument(worker.id, url)}
      accept=".pdf,.jpg,.jpeg,.png"
      maxSize={8}
      required
      disabled={submission.approval_status !== 'PENDING_APPROVAL' && submission.approval_status !== 'NEEDS_REVISION'}
    />
  </div>
</div>
```

### 4. Replace Tanggal Pelaksanaan dengan DateRangePicker

**CARI di Informasi Pekerjaan:**
```tsx
<div>
  <Label htmlFor="pelaksanaan">Pelaksanaan</Label>
  <Input
    id="pelaksanaan"
    name="pelaksanaan"
    value={formData.pelaksanaan}
    onChange={handleChange}
    required
  />
</div>
```

**REPLACE WITH:**
```tsx
<div>
  <Label htmlFor="implementation_dates">Tanggal Pelaksanaan <span className="text-red-500">*</span></Label>
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
      placeholder="Pilih jam kerja untuk hari libur"
      disabled={submission.approval_status !== 'PENDING_APPROVAL' && submission.approval_status !== 'NEEDS_REVISION'}
    />
  </div>
)}
```

### 5. Hapus Field Lama yang Tidak Diperlukan

Hapus bagian upload dokumen SIMJA dan SIKA yang lama (yang menggunakan single file upload), karena sudah diganti dengan `SupportDocumentList`.

**HAPUS sekitar baris 800-900 (jika ada):**
- File Upload Areas untuk SIMJA
- File Upload Areas untuk SIKA
- Nomor SIMJA/SIKA individual fields
- Tanggal SIMJA/SIKA individual fields

## Selesai!

Setelah semua perubahan di atas diterapkan, form edit submission akan:

✅ Memiliki validasi lengkap seperti SubmissionForm
✅ Support multiple documents untuk SIMJA dan SIKA
✅ Support optional documents (Work Order, Kontrak Kerja, JSA)
✅ Memiliki HSSE Pass untuk setiap pekerja
✅ Menggunakan DateRangePicker untuk tanggal pelaksanaan
✅ Conditional holiday working hours jika ada weekend
✅ Prevent double submission
✅ Support resubmit untuk status NEEDS_REVISION

## Testing

Test dengan scenario:
1. Edit pengajuan dengan status NEEDS_REVISION
2. Coba hapus semua dokumen SIMJA → harus error
3. Coba kosongkan HSSE Pass → harus error
4. Pilih tanggal dengan weekend → field holiday hours harus muncul
5. Submit perubahan → harus berhasil dan status berubah ke PENDING_REVIEW
