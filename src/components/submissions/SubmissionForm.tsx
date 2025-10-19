'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import DatePicker from '@/components/form/DatePicker';
import TimePicker from '@/components/form/TimePicker';
import EnhancedFileUpload from '@/components/form/EnhancedFileUpload';
import { useToast } from '@/hooks/useToast';
import { SubmissionData } from '@/types';

// import modal konfirmasi
import ConfirmModal from '@/components/ui/modal/ConfirmModal'; // sesuaikan path dengan struktur proyekmu

// ===============================
// Types
// ===============================
interface Worker {
  id: string;
  worker_name: string;
  worker_photo: string;
  hsse_pass_number?: string;
  hsse_pass_valid_thru?: string;
  hsse_pass_document_upload?: string;
}

// ===============================
// DRAFT PERSISTENCE
// ===============================
const STORAGE_KEY = 'simlok:submissionFormDraft.v1';
const DRAFT_VERSION = 1;

type DraftShape = {
  v: number;
  formData: SubmissionData;
  workers: Worker[];
  desiredCount: number;
  workerCountInput: string;
  showBulk: boolean;
  bulkNames: string;
};

// ===============================
// Component
// ===============================
export default function SubmissionForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  // menandai adanya draft
  const [hasDraft, setHasDraft] = useState(false);

  // state modal konfirmasi hapus draft
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  // Prevent double toast for draft restoration
  const draftToastShownRef = useRef(false);

  // -------------------------------
  // Workers state + helpers
  // -------------------------------
  const [workers, setWorkers] = useState<Worker[]>([
    { 
      id: `${Date.now()}`, 
      worker_name: '', 
      worker_photo: '',
      hsse_pass_number: '',
      hsse_pass_valid_thru: '',
      hsse_pass_document_upload: ''
    },
  ]);

  const [desiredCount, setDesiredCount] = useState<number>(1);
  const [workerCountInput, setWorkerCountInput] = useState<string>('1');

  // bulk add
  const [showBulk, setShowBulk] = useState(false);
  const [bulkNames, setBulkNames] = useState('');

  // autofocus name input setelah tambah baris
  const lastAddedRef = useRef<HTMLInputElement | null>(null);

  // -------------------------------
  // Form data
  // -------------------------------
  const [formData, setFormData] = useState<SubmissionData>({
    vendor_name: '',
    based_on: '',
    officer_name: '',
    job_description: '',
    work_location: '',
    working_hours: '',
    work_facilities: '',
    worker_count: 1,
    worker_names: '',

    simja_number: '',
    simja_date: '',
    simja_document_upload: '',
    simja_type: '',

    sika_number: '',
    sika_date: '',
    sika_document_upload: '',
    sika_type: '',

    // HSSE Pass
    hsse_pass_number: '',
    hsse_pass_valid_thru: null,
    hsse_pass_document_upload: '',
  });

  // ===============================
  // PERSISTENCE: LOAD DRAFT (on mount)
  // ===============================
  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (draftToastShownRef.current) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: DraftShape = JSON.parse(raw);
      if (!parsed || parsed.v !== DRAFT_VERSION) return;

      setFormData(parsed.formData);
      setWorkers(parsed.workers?.length ? parsed.workers : [{ id: `${Date.now()}`, worker_name: '', worker_photo: '' }]);
      setDesiredCount(parsed.desiredCount ?? parsed.workers?.length ?? 1);
      setWorkerCountInput(parsed.workerCountInput ?? String(parsed.workers?.length ?? 1));
      setShowBulk(Boolean(parsed.showBulk));
      setBulkNames(parsed.bulkNames ?? '');

      setHasDraft(true);

      // Show toast only once
      showSuccess('Draft Dipulihkan', 'Data terakhir yang belum tersimpan berhasil dipulihkan dari penyimpanan lokal.');
      draftToastShownRef.current = true;
    } catch (e) {
      console.warn('Gagal memulihkan draft:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps is intentional - only run on mount

  // Prefill vendor/officer dari session
  useEffect(() => {
    if (session?.user) {
      setFormData((prev) => ({
        ...prev,
        vendor_name: (session.user as any).vendor_name || prev.vendor_name || '',
        officer_name: (session.user as any).officer_name || prev.officer_name || '',
      }));
    }
  }, [session]);

  // Sync awal jika tidak ada draft
  useEffect(() => {
    if (workerCountInput !== '1' || workers.length !== 1) return;
    const initial = workers.length || 1;
    setDesiredCount(initial);
    setWorkerCountInput(String(initial));
    setFormData((prev) => ({ ...prev, worker_count: initial }));
  }, [workerCountInput, workers.length]);

  // ===============================
  // PERSISTENCE: SAVE (debounced)
  // ===============================
  const saveTimer = useRef<number | null>(null);
  const saveDraft = (payload: DraftShape) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      if (!hasDraft) setHasDraft(true);
    } catch (e) {
      console.warn('Gagal menyimpan draft:', e);
    }
  };

  const scheduleSave = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const draft: DraftShape = {
        v: DRAFT_VERSION,
        formData,
        workers,
        desiredCount,
        workerCountInput,
        showBulk,
        bulkNames,
      };
      saveDraft(draft);
    }, 500) as unknown as number;
  };

  useEffect(() => {
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, workers, desiredCount, workerCountInput, showBulk, bulkNames]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, []);

  // ===============================
  // Derived
  // ===============================
  const effectiveDesired = workerCountInput === '' ? workers.length : desiredCount;

  const rowsMismatch = useMemo(
    () => workers.length !== effectiveDesired,
    [workers.length, effectiveDesired]
  );

  // Tampilkan tombol hapus draft hanya jika:
  // - ada draft
  // - "Berdasarkan" terisi
  // - ada minimal satu pekerja dengan foto
  const canShowDelete = useMemo(() => {
    const basedFilled = (formData.based_on || '').trim().length > 0;
    const hasAnyPhoto = workers.some((w) => (w.worker_photo || '').trim().length > 0);
    return hasDraft && basedFilled || hasAnyPhoto;
  }, [hasDraft, formData.based_on, workers]);

  // -------------------------------
  // Utilities
  // -------------------------------
  const focusLastAdded = () => {
    setTimeout(() => {
      lastAddedRef.current?.focus();
      lastAddedRef.current?.select();
    }, 0);
  };

  // -------------------------------
  // Handlers: generic fields
  // -------------------------------
  const handleFileUpload = (fieldName: keyof SubmissionData) => (url: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: url }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      let processedValue: number | undefined;

      if (value === '' || value === null) {
        processedValue = undefined;
      } else {
        const numValue = Number(value);
        processedValue = isNaN(numValue) ? undefined : numValue;
      }

      setFormData((prev) => ({
        ...prev,
        [name]: processedValue as any,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value === null || value === undefined ? '' : String(value),
      }));
    }
  };

  const handleDateChange = (name: keyof SubmissionData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTimeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, working_hours: value }));
  };

  // -------------------------------
  // Handlers: workers
  // -------------------------------
  const addWorker = (presetName = '') => {
    const newWorker: Worker = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      worker_name: presetName,
      worker_photo: '',
      hsse_pass_number: '',
      hsse_pass_valid_thru: '',
      hsse_pass_document_upload: ''
    };
    setWorkers((prev) => [...prev, newWorker]);
    setDesiredCount((n) => {
      const next = n + 1;
      setWorkerCountInput(String(next));
      return next;
    });
    focusLastAdded();
  };

  const removeWorker = (id: string) => {
    setWorkers((prev) => {
      const nextArr = prev.filter((w) => w.id !== id);
      const nextLen = Math.max(1, nextArr.length);
      setDesiredCount(nextLen);
      setWorkerCountInput(String(nextLen));
      return nextArr.length > 0 ? nextArr : prev;
    });
  };

  const updateWorkerName = (id: string, name: string) => {
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, worker_name: name } : w)));
  };

  const updateWorkerPhoto = (id: string, url: string) => {
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, worker_photo: url } : w)));
  };

  const updateWorkerHsseNumber = (id: string, value: string) => {
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, hsse_pass_number: value } : w)));
  };

  const updateWorkerHsseValidThru = (id: string, value: string) => {
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, hsse_pass_valid_thru: value } : w)));
  };

  const updateWorkerHsseDocument = (id: string, url: string) => {
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, hsse_pass_document_upload: url } : w)));
  };

  const applyDesiredCount = () => {
    const count =
      workerCountInput === ''
        ? workers.length
        : Math.max(1, Math.min(9999, Number(desiredCount || 1)));

    if (count > workers.length) {
      const delta = count - workers.length;
      const toAdd: Worker[] = Array.from({ length: delta }).map(() => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        worker_name: '',
        worker_photo: '',
        hsse_pass_number: '',
        hsse_pass_valid_thru: '',
        hsse_pass_document_upload: ''
      }));
      setWorkers((prev) => [...prev, ...toAdd]);
      focusLastAdded();
    } else if (count < workers.length) {
      setWorkers((prev) => prev.slice(0, count));
    }

    setDesiredCount(count);
    setWorkerCountInput(String(count));
  };

  const addBulkWorkers = () => {
    const lines = bulkNames
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const toAdd: Worker[] = lines.map((name) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      worker_name: name,
      worker_photo: '',
      hsse_pass_number: '',
      hsse_pass_valid_thru: '',
      hsse_pass_document_upload: ''
    }));

    setWorkers((prev) => [...prev, ...toAdd]);
    setDesiredCount((n) => {
      const next = n + toAdd.length;
      setWorkerCountInput(String(next));
      return next;
    });
    setBulkNames('');
    setShowBulk(false);
    focusLastAdded();
  };

  // -------------------------------
  // Delete draft via modal
  // -------------------------------
  const openDeleteDraftModal = () => setIsDeleteModalOpen(true);
  const closeDeleteDraftModal = () => {
    if (!isDeletingDraft) setIsDeleteModalOpen(false);
  };

  const confirmDeleteDraft = async () => {
    try {
      setIsDeletingDraft(true);

      // hapus draft
      localStorage.removeItem(STORAGE_KEY);
      setHasDraft(false);

      // reset state form
      setFormData({
        vendor_name: (session?.user as any)?.vendor_name || '',
        based_on: '',
        officer_name: (session?.user as any)?.officer_name || '',
        job_description: '',
        work_location: '',
        working_hours: '',
        work_facilities: '',
        worker_count: 1,
        simja_number: '',
        simja_date: '',
        sika_number: '',
        sika_date: '',
    
        worker_names: '',
        sika_document_upload: '',
        simja_document_upload: '',

        // HSSE Pass
        hsse_pass_number: '',
        hsse_pass_valid_thru: null,
        hsse_pass_document_upload: '',
      });
      setWorkers([{ 
        id: `${Date.now()}`, 
        worker_name: '', 
        worker_photo: '',
        hsse_pass_number: '',
        hsse_pass_valid_thru: '',
        hsse_pass_document_upload: ''
      }]);
      setDesiredCount(1);
      setWorkerCountInput('1');
      setShowBulk(false);
      setBulkNames('');

      showSuccess('Draft Berhasil Dihapus', 'Semua data draft telah dihapus dan form dikembalikan ke kondisi awal.');
    } finally {
      setIsDeletingDraft(false);
      setIsDeleteModalOpen(false);
    }
  };

  // -------------------------------
  // Submit
  // -------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validasi nomor dokumen wajib
      if (!formData.sika_number || !formData.sika_number.trim()) {
        showError('Nomor Dokumen Tidak Lengkap', 'Nomor SIKA wajib diisi sebelum membuat pengajuan.');
        setIsLoading(false);
        return;
      }

      if (!formData.simja_number || !formData.simja_number.trim()) {
        showError('Nomor Dokumen Tidak Lengkap', 'Nomor SIMJA wajib diisi sebelum membuat pengajuan.');
        setIsLoading(false);
        return;
      }

      // Validasi tanggal wajib
      if (!formData.sika_date || !formData.sika_date.trim()) {
        showError('Tanggal Tidak Lengkap', 'Tanggal SIKA wajib diisi sebelum membuat pengajuan.');
        setIsLoading(false);
        return;
      }

      if (!formData.simja_date || !formData.simja_date.trim()) {
        showError('Tanggal Tidak Lengkap', 'Tanggal SIMJA wajib diisi sebelum membuat pengajuan.');
        setIsLoading(false);
        return;
      }

      // Validasi dokumen wajib
      if (!formData.sika_document_upload || !formData.sika_document_upload.trim()) {
        showError('Dokumen Tidak Lengkap', 'Dokumen SIKA wajib diunggah sebelum membuat pengajuan.');
        setIsLoading(false);
        return;
      }

      if (!formData.simja_document_upload || !formData.simja_document_upload.trim()) {
        showError('Dokumen Tidak Lengkap', 'Dokumen SIMJA wajib diunggah sebelum membuat pengajuan.');
        setIsLoading(false);
        return;
      }

      // Validasi HSSE Pass (opsional, tapi jika diisi harus lengkap semua)
      const hssePassNumber = formData.hsse_pass_number?.trim() || '';
      const hssePassValidThru = formData.hsse_pass_valid_thru ? String(formData.hsse_pass_valid_thru).trim() : '';
      const hssePassDocument = formData.hsse_pass_document_upload?.trim() || '';

      const hssePassFilled = [hssePassNumber, hssePassValidThru, hssePassDocument].filter(Boolean);

      if (hssePassFilled.length > 0 && hssePassFilled.length < 3) {
        const missingFields = [];
        if (!hssePassNumber) missingFields.push('Nomor HSSE Pass');
        if (!hssePassValidThru) missingFields.push('Tanggal Berlaku');
        if (!hssePassDocument) missingFields.push('Dokumen HSSE Pass');

        showError(
          'Data HSSE Pass Tidak Lengkap', 
          `HSSE Pass bersifat opsional, tetapi jika ingin mengisi, semua field harus dilengkapi. Field yang belum diisi: ${missingFields.join(', ')}.`
        );
        setIsLoading(false);
        return;
      }

      if (workers.length === 0) {
        showError('Data Pekerja Tidak Lengkap', 'Minimal harus ada satu pekerja dalam pengajuan.');
        setIsLoading(false);
        return;
      }

      if (workerCountInput === '') {
        showError('Jumlah Pekerja Kosong', 'Silakan isi jumlah pekerja atau klik tombol "Sesuaikan" untuk menyesuaikan dengan jumlah baris.');
        setIsLoading(false);
        return;
      }

      if (workers.length !== desiredCount) {
        showError('Jumlah Pekerja Tidak Sesuai', 'Jumlah baris pekerja tidak sama dengan input "Jumlah Pekerja". Klik "Sesuaikan" untuk menyamakan jumlahnya.');
        setIsLoading(false);
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
          showError(
            'Data Pekerja Tidak Lengkap',
            `Pekerja ${i + 1} (${worker.worker_name || 'Tanpa Nama'}): Field yang belum diisi: ${missingFields.join(', ')}. Semua field wajib diisi.`
          );
          setIsLoading(false);
          return;
        }
      }

      const workerNames = workers.map((w) => w.worker_name.trim()).join('\n');

      const payload: SubmissionData & { workers: Worker[] } = {
        ...formData,
        worker_count: Math.max(1, desiredCount || 1),
        worker_names: workerNames,
        workers,
      };

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error((error as any).error || 'Failed to create submission');
      }

      // bersihkan draft setelah submit
      localStorage.removeItem(STORAGE_KEY);
      setHasDraft(false);

      showSuccess('Pengajuan Berhasil Dibuat', 'Pengajuan SIMLOK Anda telah berhasil disimpan dan akan segera diproses.');
      router.push('/vendor/submissions');
    } catch (error) {
      console.error('Error creating submission:', error);
      const errorMessage = error instanceof Error 
        ? (error.message.includes('Failed to create submission') 
           ? 'Gagal membuat pengajuan. Silakan coba lagi.' 
           : error.message)
        : 'Terjadi kesalahan saat menyimpan pengajuan. Silakan coba lagi.';
      
      showError('Gagal Membuat Pengajuan', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ===============================
  // Render
  // ===============================
  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <div className="p-6">
          {/* Toolbar ringan: hanya muncul jika ada draft + based_on terisi + ada foto pekerja */}
          {canShowDelete && (
            <div className="mb-4 flex w-full items-center justify-end gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
                Draft aktif
              </span>
              <button
                type="button"
                className="text-xs text-red-600 hover:underline"
                onClick={openDeleteDraftModal}
                title="Hapus draft tersimpan"
              >
                Hapus Draft
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ================= Vendor ================= */}
            <div className="p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">
                Informasi Vendor
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="vendor_name">Nama Vendor <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="vendor_name"
                    name="vendor_name"
                    type="text"
                    value={(session?.user as any)?.vendor_name || formData.vendor_name || ''}
                    onChange={handleChange}
                    required
                    disabled={!!(session?.user as any)?.vendor_name}
                    placeholder="Masukkan nama vendor"
                    className={(session?.user as any)?.vendor_name ? 'cursor-not-allowed bg-gray-50' : ''}
                  />
                </div>

                <div>
                  <Label htmlFor="officer_name">Nama Petugas <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="officer_name"
                    name="officer_name"
                    type="text"
                    value={formData.officer_name || ''}
                    onChange={handleChange}
                    required
                    placeholder="Nama petugas yang bertanggung jawab"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="based_on">Berdasarkan <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="based_on"
                    name="based_on"
                    type="text"
                    value={formData.based_on}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Surat Izin Kerja No. 123/2024"
                  />
                </div>

                {/* Dokumen */}
                <div>
                  <Label htmlFor="simja_number">Nomor SIMJA <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="simja_number"
                    name="simja_number"
                    type="text"
                    value={formData.simja_number || ''}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: SIMJA/2024/001"
                  />
                </div>

                
                <div>
                  <Label htmlFor="sika_number">Nomor SIKA <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="sika_number"
                    name="sika_number"
                    type="text"
                    value={formData.sika_number || ''}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: SIKA/2024/001"
                  />
                </div>
<div>
                  <Label htmlFor="simja_type">Tipe SIMJA <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="simja_type"
                    name="simja_type"
                    type="text"
                    value={formData.simja_type || ''}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Ast. Man. Facility Management"
                    />
                </div>

                <div>
                  <Label htmlFor="sika_type">Tipe SIKA <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="sika_type"
                    name="sika_type"
                    type="text"
                    value={formData.sika_type || ''}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Pekerjaan dingin / panas"
                  />
                </div>

                <div>
                  <Label htmlFor="simja_date">Tanggal SIMJA <span className="ml-1 text-red-500">*</span></Label>
                  <DatePicker
                    id="simja_date"
                    name="simja_date"
                    value={formData.simja_date || ''}
                    onChange={handleDateChange('simja_date')}
                    placeholder="Pilih tanggal SIMJA"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sika_date">Tanggal SIKA <span className="ml-1 text-red-500">*</span></Label>
                  <DatePicker
                    id="sika_date"
                    name="sika_date"
                    value={formData.sika_date || ''}
                    onChange={handleDateChange('sika_date')}
                    placeholder="Pilih tanggal SIKA"
                    required
                  />
                </div>

                {/* Upload dokumen */}
                <div className="space-y-2">
                  <Label htmlFor="simja_document_upload">
                    UPLOAD DOKUMEN SIMJA
                    <span className="ml-1 text-red-500"><span className="ml-1 text-red-500">*</span></span>
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <EnhancedFileUpload
                      id="simja_document_upload"
                      name="simja_document_upload"
                      value={formData.simja_document_upload || ''}
                      onChange={handleFileUpload('simja_document_upload')}
                      uploadType="document"
                      label=""
                      
                      required={false}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sika_document_upload">
                    UPLOAD DOKUMEN SIKA
                    <span className="ml-1 text-red-500"><span className="ml-1 text-red-500">*</span></span>
                  </Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <EnhancedFileUpload
                      id="sika_document_upload"
                      name="sika_document_upload"
                      value={formData.sika_document_upload || ''}
                      onChange={handleFileUpload('sika_document_upload')}
                      uploadType="document"
                      required={false}
                      label=""
                      
                    />
                  </div>
                </div>

                {/* HSSE Pass Section */}
                <div className="md:col-span-2 mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-semibold text-gray-900">
                      HSSE Pass (Opsional)
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Jika diisi, semua field harus lengkap
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="hsse_pass_number">Nomor HSSE Pass</Label>
                      <Input
                        id="hsse_pass_number"
                        name="hsse_pass_number"
                        type="text"
                        value={formData.hsse_pass_number || ''}
                        onChange={handleChange}
                        placeholder="Contoh: HSSE/2024/001"
                      />
                    </div>

                    <div>
                      <Label htmlFor="hsse_pass_valid_thru">Berlaku Sampai</Label>
                      <DatePicker
                        id="hsse_pass_valid_thru"
                        name="hsse_pass_valid_thru"
                        value={formData.hsse_pass_valid_thru ? String(formData.hsse_pass_valid_thru) : ''}
                        onChange={handleDateChange('hsse_pass_valid_thru')}
                        placeholder="Pilih tanggal berlaku"
                        required={false}
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="hsse_pass_document_upload">
                        Upload Dokumen HSSE Pass
                      </Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <EnhancedFileUpload
                          id="hsse_pass_document_upload"
                          name="hsse_pass_document_upload"
                          value={formData.hsse_pass_document_upload || ''}
                          onChange={handleFileUpload('hsse_pass_document_upload')}
                          uploadType="document"
                          label=""
                          
                          required={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= Pekerjaan ================= */}
            <div className="p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">
                Informasi Pekerjaan
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="job_description">Pekerjaan <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="job_description"
                    name="job_description"
                    type="text"
                    value={formData.job_description}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Instalasi dan pemeliharaan peralatan"
                  />
                </div>

                <div>
                  <Label htmlFor="work_location">Lokasi Kerja <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="work_location"
                    name="work_location"
                    type="text"
                    value={formData.work_location}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Area Produksi Unit 1, Kilang Cilacap"
                  />
                </div>

                <div>
                  <Label htmlFor="working_hours">Jam Kerja <span className="ml-1 text-red-500">*</span></Label>
                  <TimePicker
                    id="working_hours"
                    name="working_hours"
                    value={formData.working_hours}
                    onChange={handleTimeChange}
                    required
                    placeholder="Pilih jam kerja"
                  />
                </div>

                <div>
                  <Label htmlFor="work_facilities">Sarana Kerja <span className="ml-1 text-red-500">*</span></Label>
                  <Input
                    id="work_facilities"
                    name="work_facilities"
                    value={formData.work_facilities}
                    onChange={handleChange}
                    placeholder="Contoh: Toolkit lengkap, APD standar, crane mobile"
                    required
                  />
                </div>
              </div>
            </div>

            {/* ================= Workers ================= */}
            <div className="p-6 rounded-lg">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-3 ">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Daftar Pekerja</h2>

                  {rowsMismatch ? (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Baris saat ini: {workers.length}. Klik <b>Sesuaikan</b> untuk menambah/mengurangi.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Lengkapi Nama dan Foto. Anda bisa tambah satu per satu atau tempel banyak nama.
                    </p>
                  )}
                </div>

                <div className="flex items-end gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-[180px]">
                    <Label htmlFor="worker_count">Jumlah Pekerja <span className="ml-1 text-red-500">*</span></Label>

                    <input
                      id="worker_count"
                      name="worker_count"
                      type="text"
                      value={workerCountInput}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        if (inputValue === '') {
                          setWorkerCountInput('');
                          return;
                        }
                        const clean = inputValue.replace(/\D/g, '');
                        if (clean === '') {
                          setWorkerCountInput('');
                          return;
                        }
                        const num = Math.max(1, Math.min(9999, parseInt(clean, 10)));
                        setWorkerCountInput(clean);
                        setDesiredCount(num);
                      }}
                      onKeyDown={(e) => {
                        const allowed = [
                          'Backspace', 'Delete', 'Tab', 'Enter', 'Escape',
                          'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                          'Home', 'End'
                        ];
                        if (allowed.includes(e.key)) return;
                        if ((e.ctrlKey || e.metaKey) && ['a','c','v','x','z'].includes(e.key.toLowerCase())) return;
                        if (!/[0-9]/.test(e.key)) e.preventDefault();
                      }}
                      onBlur={() => {
                        if (workerCountInput === '') {
                          const fallback = workers.length || 1;
                          setDesiredCount(fallback);
                          setWorkerCountInput(String(fallback));
                        }
                      }}
                      placeholder="Masukkan jumlah pekerja"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                        rowsMismatch ? 'border-amber-300' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  <div className="flex gap-2 flex-shrink-0 whitespace-nowrap">
                    <Button
                      type="button"
                      onClick={() => addWorker()}
                      className="whitespace-nowrap"
                    >
                      + Tambah
                    </Button>
                    {rowsMismatch && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={applyDesiredCount}
                        className="whitespace-nowrap"
                      >
                        Sesuaikan
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant={showBulk ? 'destructive' : 'outline'}
                      onClick={() => setShowBulk((s) => !s)}
                      className="whitespace-nowrap"
                    >
                      {showBulk ? 'Tutup Tambah Cepat' : 'Tambah Cepat'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tambah Cepat */}
              {showBulk && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <Label htmlFor="bulk_names">Tempel banyak nama (satu per baris)</Label>
                  <textarea
                    id="bulk_names"
                    className="mt-1 w-full rounded-md border border-blue-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    rows={4}
                    placeholder={`Contoh:\nBudi Santoso\nSari Dewi\nAndi Wijaya`}
                    value={bulkNames}
                    
                    onChange={(e) => setBulkNames(e.target.value)}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <Button type="button" onClick={addBulkWorkers}>Tambahkan</Button>
                    <Button type="button" variant="outline" onClick={() => setBulkNames('')}>Bersihkan</Button>
                  </div>
                </div>
              )}

              {/* Daftar Pekerja - Compact Layout */}
              <div className="space-y-3">
                {workers.map((w, idx) => {
                  const allFieldsComplete = !!w.worker_name.trim() && 
                                           !!w.worker_photo.trim() && 
                                           !!w.hsse_pass_number?.trim() && 
                                           !!w.hsse_pass_valid_thru?.trim() && 
                                           !!w.hsse_pass_document_upload?.trim();
                  
                  return (
                    <div key={w.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:border-gray-300 transition-colors">
                      {/* Header dengan Nomor dan Tombol Hapus */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                            {idx + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {w.worker_name || `Pekerja ${idx + 1}`}
                          </span>
                          {allFieldsComplete && (
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">✓ Lengkap</span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7"
                          onClick={() => removeWorker(w.id)}
                          disabled={workers.length <= 1}
                          title={workers.length <= 1 ? 'Minimal 1 pekerja' : 'Hapus pekerja'}
                        >
                          Hapus
                        </Button>
                      </div>

                      {/* Grid 2 Kolom: Kiri (Nama & HSSE) | Kanan (Upload Foto & Dokumen) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Kolom Kiri - Input Text */}
                        <div className="space-y-3">
                          {/* Nama Pekerja */}
                          <div>
                            <Label htmlFor={`worker_name_${w.id}`}>Nama Pekerja <span className="ml-1 text-red-500">*</span></Label>
                            <Input
                              id={`worker_name_${w.id}`}
                              name={`worker_name_${w.id}`}
                              type="text"
                              value={w.worker_name}
                              onChange={(e) => updateWorkerName(w.id, e.target.value)}
                              placeholder="Nama lengkap pekerja"
                              required
                              validationMode='letters'
                            />
                          </div>

                          {/* Nomor HSSE Pass */}
                          <div>
                            <Label htmlFor={`hsse_number_${w.id}`}>Nomor HSSE Pass <span className="ml-1 text-red-500">*</span></Label>
                            <Input
                              id={`hsse_number_${w.id}`}
                              name={`hsse_number_${w.id}`}
                              type="text"
                              value={w.hsse_pass_number || ''}
                              onChange={(e) => updateWorkerHsseNumber(w.id, e.target.value)}
                              placeholder="Contoh: HSSE/2024/001"
                              required
                            />
                          </div>

                          {/* Tanggal Berlaku HSSE */}
                          <div>
                            <Label htmlFor={`hsse_valid_${w.id}`}>Berlaku Sampai <span className="ml-1 text-red-500">*</span></Label>
                            <DatePicker
                              id={`hsse_valid_${w.id}`}
                              name={`hsse_valid_${w.id}`}
                              value={w.hsse_pass_valid_thru || ''}
                              onChange={(value) => updateWorkerHsseValidThru(w.id, value)}
                              placeholder="Pilih tanggal"
                              required
                            />
                          </div>
                        </div>

                        {/* Kolom Kanan - Upload Files */}
                        <div className="flex gap-3">
                          {/* Upload Foto Pekerja */}
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={`worker_photo_${w.id}`}>Foto Pekerja <span className="ml-1 text-red-500">*</span></Label>
                            <div className="text-xs text-gray-500 mb-1">Wajib diisi</div>
                            <EnhancedFileUpload
                              id={`worker_photo_${w.id}`}
                              name={`worker_photo_${w.id}`}
                              value={w.worker_photo}
                              onChange={(url) => updateWorkerPhoto(w.id, url)}
                              uploadType="worker-photo"
                              workerName={w.worker_name || `Pekerja ${idx + 1}`}
                              required={false}
                            />
                          </div>

                          {/* Upload Dokumen HSSE Pass */}
                          <div className="flex-1 min-w-0">
                            <Label htmlFor={`hsse_doc_${w.id}`}>Dokumen HSSE Pass <span className="ml-1 text-red-500">*</span></Label>
                            <div className="text-xs text-gray-500 mb-1">Wajib diisi</div>
                            <EnhancedFileUpload
                              id={`hsse_doc_${w.id}`}
                              name={`hsse_doc_${w.id}`}
                              value={w.hsse_pass_document_upload || ''}
                              onChange={(url) => updateWorkerHsseDocument(w.id, url)}
                              uploadType="document"
                              maxFileNameLength={15}
                              required={false}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="font-medium text-blue-900 mb-1"> Petunjuk Pengisian:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                  <li><b>Semua field wajib diisi</b> untuk setiap pekerja (Nama, Foto, HSSE Pass)</li>
                  <li>Gunakan tombol "Sesuaikan" jika jumlah pekerja tidak sesuai</li>
                </ul>
              </div>
            </div>

            {/* ================= Actions ================= */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Menyimpan...' : 'Buat Pengajuan'}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Modal Konfirmasi Hapus Draft */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteDraftModal}
        onConfirm={confirmDeleteDraft}
        title="Hapus Draft?"
        message="Tindakan ini akan menghapus semua data draft yang tersimpan dan mengembalikan form ke kondisi awal."
        confirmText="Hapus"
        cancelText="Batal"
        showCancel
        variant="danger"
        isLoading={isDeletingDraft}
      />
    </div>
  );
}
