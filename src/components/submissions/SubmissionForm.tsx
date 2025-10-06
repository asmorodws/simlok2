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
import Alert from '../ui/alert/Alert';
import { useToast } from '@/hooks/useToast';
import { SubmissionData } from '@/types/submission';

// import modal konfirmasi
import ConfirmModal from '@/components/ui/modal/ConfirmModal'; // sesuaikan path dengan struktur proyekmu

// ===============================
// Types
// ===============================
interface Worker {
  id: string;
  worker_name: string;
  worker_photo: string;
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
  const [alert, setAlert] = useState<{
    variant: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // menandai adanya draft
  const [hasDraft, setHasDraft] = useState(false);

  // state modal konfirmasi hapus draft
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  // -------------------------------
  // Workers state + helpers
  // -------------------------------
  const [workers, setWorkers] = useState<Worker[]>([
    { id: `${Date.now()}`, worker_name: '', worker_photo: '' },
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
    simja_number: '',
    simja_date: '',
    sika_number: '',
    sika_date: '',
    worker_names: '',
    sika_document_upload: '',
    simja_document_upload: '',
  });

  // ===============================
  // PERSISTENCE: LOAD DRAFT (on mount)
  // ===============================
  useEffect(() => {
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

      setAlert({
        variant: 'info',
        title: 'Draft Dipulihkan',
        message: 'Data terakhir yang belum tersimpan berhasil dipulihkan.',
      });
      setTimeout(() => setAlert(null), 4000);
    } catch (e) {
      console.warn('Gagal memulihkan draft:', e);
    }
  }, []);

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

  const allWorkersValid = useMemo(
    () => workers.every((w) => w.worker_name.trim() && w.worker_photo.trim()),
    [workers]
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
  const statusPill = (ok: boolean) => (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
        ok
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}
    >
      {ok ? 'Lengkap' : 'Perlu dilengkapi'}
    </span>
  );

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
      });
      setWorkers([{ id: `${Date.now()}`, worker_name: '', worker_photo: '' }]);
      setDesiredCount(1);
      setWorkerCountInput('1');
      setShowBulk(false);
      setBulkNames('');

      setAlert({
        variant: 'success',
        title: 'Draft Dihapus',
        message: 'Semua data draft berhasil dihapus. Form dikembalikan ke kondisi awal.',
      });
      setTimeout(() => setAlert(null), 3000);
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
      if (workers.length === 0) {
        setAlert({
          variant: 'error',
          title: 'Error',
          message: 'Minimal harus ada satu pekerja.',
        });
        setIsLoading(false);
        return;
      }

      if (workerCountInput === '') {
        setAlert({
          variant: 'warning',
          title: 'Jumlah Pekerja Kosong',
          message:
            'Isi angka pada "Jumlah Pekerja" atau klik Sesuaikan agar sesuai dengan baris yang ada.',
        });
        setIsLoading(false);
        return;
      }

      if (workers.length !== desiredCount) {
        setAlert({
          variant: 'warning',
          title: 'Jumlah Tidak Sinkron',
          message:
            'Jumlah baris pekerja tidak sama dengan input "Jumlah Pekerja". Klik "Sesuaikan" atau perbarui angkanya.',
        });
        setIsLoading(false);
        return;
      }

      const invalidNames = workers.filter((w) => !w.worker_name.trim()).length;
      const invalidPhotos = workers.filter((w) => !w.worker_photo.trim()).length;

      if (invalidNames > 0 || invalidPhotos > 0) {
        setAlert({
          variant: 'error',
          title: 'Form Pekerja Belum Lengkap',
          message:
            invalidNames > 0
              ? 'Ada nama pekerja yang kosong. Lengkapi semua nama.'
              : 'Semua pekerja harus memiliki foto. Lengkapi foto pekerja.',
        });
        setIsLoading(false);
        return;
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

      showSuccess('Berhasil', 'Pengajuan SIMLOK berhasil dibuat');
      router.push('/vendor/submissions');
    } catch (error) {
      console.error('Error creating submission:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create submission. Please try again.';
      showError('Error', errorMessage);
      setAlert({
        variant: 'error',
        title: 'Error',
        message: errorMessage,
      });
      setTimeout(() => setAlert(null), 5000);
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
                  <Label htmlFor="vendor_name">Nama Vendor</Label>
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
                  <Label htmlFor="officer_name">Nama Petugas</Label>
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
                  <Label htmlFor="based_on">Berdasarkan</Label>
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
                  <Label htmlFor="simja_number">Nomor SIMJA</Label>
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
                  <Label htmlFor="sika_number">Nomor SIKA</Label>
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
                  <Label htmlFor="simja_date">Tanggal SIMJA</Label>
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
                  <Label htmlFor="sika_date">Tanggal SIKA</Label>
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
                  <Label htmlFor="simja_document_upload">UPLOAD DOKUMEN SIMJA</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <EnhancedFileUpload
                      id="simja_document_upload"
                      name="simja_document_upload"
                      value={formData.simja_document_upload || ''}
                      onChange={handleFileUpload('simja_document_upload')}
                      uploadType="document"
                      label=""
                      description="Upload PDF/DOC/DOCX/JPG/PNG maks 8MB"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sika_document_upload">UPLOAD DOKUMEN SIKA</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <EnhancedFileUpload
                      id="sika_document_upload"
                      name="sika_document_upload"
                      value={formData.sika_document_upload || ''}
                      onChange={handleFileUpload('sika_document_upload')}
                      uploadType="document"
                      required
                      label=""
                      description="Upload PDF/DOC/DOCX/JPG/PNG maks 8MB"
                    />
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
                  <Label htmlFor="job_description">Pekerjaan</Label>
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
                  <Label htmlFor="work_location">Lokasi Kerja</Label>
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
                  <Label htmlFor="working_hours">Jam kerja</Label>
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
                  <Label htmlFor="work_facilities">Sarana kerja</Label>
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
                    <Label htmlFor="worker_count">Jumlah Pekerja</Label>

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

              {/* Tabel ringkas */}
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="grid grid-cols-12 bg-gray-50 text-xs font-semibold text-gray-600">
                  <div className="col-span-1 px-3 py-2">No</div>
                  <div className="col-span-5 px-3 py-2">Nama Pekerja</div>
                  <div className="col-span-4 px-3 py-2">Foto</div>
                  <div className="col-span-2 px-3 py-2 text-right">Aksi</div>
                </div>

                <div className="divide-y divide-gray-100">
                  {workers.map((w, idx) => {
                    const ok = !!w.worker_name.trim() && !!w.worker_photo.trim();
                    return (
                      <div key={w.id} className="grid grid-cols-12 items-center text-sm">
                        <div className="col-span-1 px-3 py-3 text-gray-500">{idx + 1}</div>

                        <div className="col-span-5 px-3 py-3">
                          <Input
                            id={`worker_name_${w.id}`}
                            name={`worker_name_${w.id}`}
                            type="text"
                            value={w.worker_name}
                            onChange={(e) => updateWorkerName(w.id, e.target.value)}
                            placeholder="Nama lengkap pekerja"

                          />
                          <div className="mt-1">{statusPill(ok)}</div>
                        </div>

                        {/* FOTO */}
                        <div className="col-span-4 px-3 py-3">
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

                        <div className="col-span-2 px-3 py-3 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => removeWorker(w.id)}
                            disabled={workers.length <= 1}
                            title={workers.length <= 1 ? 'Minimal 1 pekerja' : 'Hapus baris'}
                          >
                            Hapus
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                • Jumlah pekerja editable: ketik angka, lalu klik <b>Sesuaikan</b> untuk otomatis menambah/mengurangi baris. <br />
                • Wajib isi nama dan unggah foto untuk setiap pekerja sebelum submit.
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
                title={
                  !allWorkersValid
                    ? 'Lengkapi nama dan foto semua pekerja'
                    : rowsMismatch
                      ? 'Jumlah baris tidak sama dengan jumlah pekerja. Sesuaikan dulu.'
                      : ''
                }
              >
                {isLoading ? 'Menyimpan...' : 'Buat Pengajuan'}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* Alert */}
      {alert && <Alert variant={alert.variant} title={alert.title} message={alert.message} />}

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
