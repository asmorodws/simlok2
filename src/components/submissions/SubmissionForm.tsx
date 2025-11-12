'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import Card from '@/components/ui/Card';
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/Input';
import { Badge } from '@/components/ui/Badge';
import Label from '@/components/form/Label';
import DateRangePicker from '../form/DateRangePicker';
import DatePicker from '@/components/form/DatePicker';
import TimeRangePicker from '@/components/form/TimeRangePicker';
import EnhancedFileUpload from '@/components/form/EnhancedFileUpload';
import SupportDocumentList, { SupportDoc } from '@/components/submissions/SupportDocumentList';
import { useToast } from '@/hooks/useToast';
import { validatePDFDocument } from '@/utils/fileValidation';
import { SubmissionData } from '@/types';
import { hasWeekendInRange } from '@/utils/dateHelpers';

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
  simjaDocuments: SupportDoc[];
  sikaDocuments: SupportDoc[];
  workOrderDocuments: SupportDoc[];
  kontrakKerjaDocuments: SupportDoc[];
  jsaDocuments: SupportDoc[];
  visibleOptionalDocs: string[];
};

// ===============================
// Component
// ===============================
export default function SubmissionForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const { showSuccess, showError } = useToast();

  const [isLoading, setIsLoading] = useState(false);

  // Prevent double submission with ref flag
  const isSubmittingRef = useRef(false);

  // menandai adanya draft
  const [hasDraft, setHasDraft] = useState(false);

  // Track invalid documents (untuk highlight card yang bermasalah)
  const [invalidDocuments, setInvalidDocuments] = useState<Map<string, string>>(new Map());

  // state modal konfirmasi hapus draft
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  // Prevent double toast for draft restoration
  const draftToastShownRef = useRef(false);

  // State for weekend detection in implementation dates
  const [hasWeekend, setHasWeekend] = useState(false);

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
  // Support Documents state
  // -------------------------------
  const [simjaDocuments, setSimjaDocuments] = useState<SupportDoc[]>([
    {
      id: `${Date.now()}_simja`,
      document_subtype: '',
      document_number: '',
      document_date: '',
      document_upload: '',
    },
  ]);

  const [sikaDocuments, setSikaDocuments] = useState<SupportDoc[]>([
    {
      id: `${Date.now()}_sika`,
      document_subtype: '',
      document_number: '',
      document_date: '',
      document_upload: '',
    },
  ]);

  const [workOrderDocuments, setWorkOrderDocuments] = useState<SupportDoc[]>([
    {
      id: `${Date.now()}_work_order`,
      document_subtype: '',
      document_number: '',
      document_date: '',
      document_upload: '',
    },
  ]);

  const [kontrakKerjaDocuments, setKontrakKerjaDocuments] = useState<SupportDoc[]>([
    {
      id: `${Date.now()}_kontrak_kerja`,
      document_subtype: '',
      document_number: '',
      document_date: '',
      document_upload: '',
    },
  ]);

  const [jsaDocuments, setJsaDocuments] = useState<SupportDoc[]>([
    {
      id: `${Date.now()}_jsa`,
      document_subtype: '', // JSA tidak memiliki subtype
      document_number: '',
      document_date: '',
      document_upload: '',
    },
  ]);

  // -------------------------------
  // Form data
  // -------------------------------
  const [formData, setFormData] = useState<SubmissionData>({
    vendor_name: '',
    officer_name: '',
    job_description: '',
    work_location: '',
    implementation_start_date: '',
    implementation_end_date: '',
    working_hours: '',
    holiday_working_hours: '',
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

  // -------------------------------
  // Visible optional documents state
  // -------------------------------
  const [visibleOptionalDocs, setVisibleOptionalDocs] = useState<Set<string>>(new Set());
  const [selectedOptionalDoc, setSelectedOptionalDoc] = useState<string>('');

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

      // Load documents
      if (parsed.simjaDocuments?.length) setSimjaDocuments(parsed.simjaDocuments);
      if (parsed.sikaDocuments?.length) setSikaDocuments(parsed.sikaDocuments);
      if (parsed.workOrderDocuments?.length) setWorkOrderDocuments(parsed.workOrderDocuments);
      if (parsed.kontrakKerjaDocuments?.length) setKontrakKerjaDocuments(parsed.kontrakKerjaDocuments);
      if (parsed.jsaDocuments?.length) setJsaDocuments(parsed.jsaDocuments);

      // Load visible optional documents
      if (parsed.visibleOptionalDocs?.length) {
        setVisibleOptionalDocs(new Set(parsed.visibleOptionalDocs));
      }

      setHasDraft(true);

      // Show toast only once
      showSuccess('Draft Dipulihkan', 'Data terakhir yang belum tersimpan berhasil dipulihkan dari penyimpanan lokal.');
      draftToastShownRef.current = true;
    } catch (e) {
      console.warn('Gagal memulihkan draft:', e);
    }
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

  // Detect weekend when implementation dates change
  useEffect(() => {
    if (formData.implementation_start_date && formData.implementation_end_date) {
      const hasWeekendDays = hasWeekendInRange(
        formData.implementation_start_date,
        formData.implementation_end_date
      );
      setHasWeekend(hasWeekendDays);
    } else {
      setHasWeekend(false);
    }
  }, [formData.implementation_start_date, formData.implementation_end_date]);

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
        simjaDocuments,
        sikaDocuments,
        workOrderDocuments,
        kontrakKerjaDocuments,
        jsaDocuments,
        visibleOptionalDocs: Array.from(visibleOptionalDocs),
      };
      saveDraft(draft);
    }, 500) as unknown as number;
  };

  useEffect(() => {
    scheduleSave();
  }, [formData, workers, desiredCount, workerCountInput, showBulk, bulkNames, simjaDocuments, sikaDocuments, workOrderDocuments, kontrakKerjaDocuments, jsaDocuments, visibleOptionalDocs, scheduleSave]);

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
  // - sudah ada interaksi user (upload foto, upload dokumen, tambah dokumen opsional, atau tambah pekerja)
  const canShowDelete = useMemo(() => {
    if (!hasDraft) return false;

    // Cek apakah ada foto pekerja yang sudah diupload
    const hasAnyPhoto = workers.some((w) => (w.worker_photo || '').trim().length > 0);

    // Cek apakah ada dokumen HSSE yang sudah diupload
    const hasAnyHsseDoc = workers.some((w) => (w.hsse_pass_document_upload || '').trim().length > 0);

    // Cek apakah ada dokumen pendukung yang sudah diupload
    const hasAnyDocument = simjaDocuments.some(d => d.document_upload) ||
      sikaDocuments.some(d => d.document_upload) ||
      workOrderDocuments.some(d => d.document_upload) ||
      kontrakKerjaDocuments.some(d => d.document_upload) ||
      jsaDocuments.some(d => d.document_upload);

    // Cek apakah sudah ada dokumen opsional yang ditambahkan
    const hasOptionalDocs = visibleOptionalDocs.size > 0;

    // Cek apakah sudah menambah lebih dari 1 pekerja (dari default)
    const hasMultipleWorkers = workers.length > 1;

    return hasAnyPhoto || hasAnyHsseDoc || hasAnyDocument || hasOptionalDocs || hasMultipleWorkers;
  }, [hasDraft, workers, simjaDocuments, sikaDocuments, workOrderDocuments, kontrakKerjaDocuments, jsaDocuments, visibleOptionalDocs]);

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

  const handleTimeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, working_hours: value }));
  };

  const handleHolidayTimeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, holiday_working_hours: value }));
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
  // Optional Documents Handlers
  // -------------------------------
  const addOptionalDocument = () => {
    if (!selectedOptionalDoc) return;

    setVisibleOptionalDocs(prev => new Set(prev).add(selectedOptionalDoc));
    setSelectedOptionalDoc('');
  };

  const removeOptionalDocument = (documentType: string) => {
    setVisibleOptionalDocs(prev => {
      const newSet = new Set(prev);
      newSet.delete(documentType);
      return newSet;
    });

    // Reset document data when removed
    if (documentType === 'WORK_ORDER') {
      setWorkOrderDocuments([{
        id: `${Date.now()}_work_order`,
        document_subtype: '',
        document_number: '',
        document_date: '',
        document_upload: '',
      }]);
    } else if (documentType === 'KONTRAK_KERJA') {
      setKontrakKerjaDocuments([{
        id: `${Date.now()}_kontrak_kerja`,
        document_subtype: '',
        document_number: '',
        document_date: '',
        document_upload: '',
      }]);
    } else if (documentType === 'JSA') {
      setJsaDocuments([{
        id: `${Date.now()}_jsa`,
        document_subtype: '',
        document_number: '',
        document_date: '',
        document_upload: '',
      }]);
    }
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

      // Reset documents
      setSimjaDocuments([{
        id: `${Date.now()}_simja`,
        document_subtype: '',
        document_number: '',
        document_date: '',
        document_upload: '',
      }]);
      setSikaDocuments([{
        id: `${Date.now()}_sika`,
        document_subtype: '',
        document_number: '',
        document_date: '',
        document_upload: '',
      }]);
      setWorkOrderDocuments([{
        id: `${Date.now()}_work_order`,
        document_subtype: '',
        document_number: '',
        document_date: '',
        document_upload: '',
      }]);
      setKontrakKerjaDocuments([{
        id: `${Date.now()}_kontrak_kerja`,
        document_subtype: '',
        document_number: '',
        document_date: '',
        document_upload: '',
      }]);
      setJsaDocuments([{
        id: `${Date.now()}_jsa`,

        document_subtype: '',
        document_number: '',
        document_date: '',
        document_upload: '',
      }]);

      // Reset visible optional documents
      setVisibleOptionalDocs(new Set());
      setSelectedOptionalDoc('');

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

    // ========== PREVENT DOUBLE SUBMISSION ==========
    if (isSubmittingRef.current) {
      console.warn('⚠️ Submission already in progress, ignoring duplicate submit');
      return;
    }

    // Set flag IMMEDIATELY to prevent race condition
    isSubmittingRef.current = true;
    setIsLoading(true);
    
    // Clear any previous invalid document markers
    setInvalidDocuments(new Map());

    // Helper to reset submission state (for early returns)
    const resetSubmission = () => {
      isSubmittingRef.current = false;
      setIsLoading(false);
    };

    try {
      // ========== VALIDASI TANGGAL PELAKSANAAN ==========
      if (!formData.implementation_start_date?.trim()) {
        showError('Tanggal Pelaksanaan Tidak Lengkap', 'Tanggal Mulai Pelaksanaan wajib diisi.');
        resetSubmission();
        return;
      }

      if (!formData.implementation_end_date?.trim()) {
        showError('Tanggal Pelaksanaan Tidak Lengkap', 'Tanggal Selesai Pelaksanaan wajib diisi.');
        resetSubmission();
        return;
      }

      // Validasi tanggal selesai tidak boleh kurang dari tanggal mulai
      const startDate = new Date(formData.implementation_start_date);
      const endDate = new Date(formData.implementation_end_date);

      if (endDate < startDate) {
        showError(
          'Tanggal Pelaksanaan Tidak Valid',
          'Tanggal Selesai Pelaksanaan tidak boleh lebih awal dari Tanggal Mulai Pelaksanaan.'
        );
        resetSubmission();
        return;
      }

      // ========== VALIDASI JAM KERJA HARI LIBUR (CONDITIONAL) ==========
      // Jika ada weekend dalam rentang tanggal pelaksanaan, jam kerja hari libur WAJIB diisi
      if (hasWeekend && !formData.holiday_working_hours?.trim()) {
        showError(
          'Jam Kerja Hari Libur Wajib Diisi',
          'Rentang tanggal pelaksanaan mencakup hari Sabtu/Minggu. Silakan isi Jam Kerja Hari Libur.'
        );
        resetSubmission();
        return;
      }

      // ========== VALIDASI DOKUMEN SIMJA ==========
      // Filter dokumen yang memiliki data (tidak kosong semua field)
      const filledSimjaDocs = simjaDocuments.filter(doc =>
        doc && (doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim())
      );

      if (filledSimjaDocs.length === 0) {
        showError('Dokumen SIMJA Wajib', 'Minimal harus ada 1 dokumen SIMJA yang lengkap.');
        resetSubmission();
        return;
      }

      // Validasi setiap dokumen SIMJA yang terisi
      for (let i = 0; i < simjaDocuments.length; i++) {
        const doc = simjaDocuments[i];
        if (!doc) continue;

        // Cek apakah ada field yang terisi
        const hasData = doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim();

        // Jika ada data, semua field harus lengkap
        if (hasData) {
          const missingFields = [];

          // SIMJA subtype otomatis terisi 'Ast. Man. Facility Management'
          if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
          if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
          if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');

          if (missingFields.length > 0) {
            showError(
              'Dokumen SIMJA Tidak Lengkap',
              `SIMJA #${i + 1}: ${missingFields.join(', ')} belum diisi. Lengkapi atau hapus card ini.`
            );
            resetSubmission();
            return;
          }
        }
      }

      // ========== VALIDASI DOKUMEN SIKA ==========
      // Filter dokumen yang memiliki data
      const filledSikaDocs = sikaDocuments.filter(doc =>
        doc && (doc.document_subtype?.trim() || doc.document_number?.trim() ||
          doc.document_date?.trim() || doc.document_upload?.trim())
      );

      if (filledSikaDocs.length === 0) {
        showError('Dokumen SIKA Wajib', 'Minimal harus ada 1 dokumen SIKA yang lengkap.');
        resetSubmission();
        return;
      }

      // Validasi setiap dokumen SIKA yang terisi
      for (let i = 0; i < sikaDocuments.length; i++) {
        const doc = sikaDocuments[i];
        if (!doc) continue;

        // Cek apakah ada field yang terisi
        const hasData = doc.document_subtype?.trim() || doc.document_number?.trim() ||
          doc.document_date?.trim() || doc.document_upload?.trim();

        // Jika ada data, semua field harus lengkap
        if (hasData) {
          const missingFields = [];

          if (!doc.document_subtype?.trim()) missingFields.push('Jenis SIKA');
          if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
          if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
          if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');

          if (missingFields.length > 0) {
            showError(
              'Dokumen SIKA Tidak Lengkap',
              `SIKA #${i + 1}: ${missingFields.join(', ')} belum diisi. Lengkapi atau hapus card ini.`
            );
            resetSubmission();
            return;
          }
        }
      }

      // ========== VALIDASI DOKUMEN WORK ORDER (OPSIONAL) ==========
      // Work Order bersifat opsional, tapi jika ada yang terisi maka harus lengkap
      for (let i = 0; i < workOrderDocuments.length; i++) {
        const doc = workOrderDocuments[i];
        if (!doc) continue;

        // Cek apakah ada field yang terisi
        const hasData = doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim();

        // Jika ada data, semua field harus lengkap
        if (hasData) {
          const missingFields = [];

          if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
          if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
          if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');

          if (missingFields.length > 0) {
            showError(
              'Dokumen Work Order Tidak Lengkap',
              `Work Order #${i + 1}: ${missingFields.join(', ')} belum diisi. Lengkapi atau hapus card ini.`
            );
            resetSubmission();
            return;
          }
        }
      }

      // ========== VALIDASI DOKUMEN KONTRAK KERJA (OPSIONAL) ==========
      // Kontrak Kerja bersifat opsional, tapi jika ada yang terisi maka harus lengkap
      for (let i = 0; i < kontrakKerjaDocuments.length; i++) {
        const doc = kontrakKerjaDocuments[i];
        if (!doc) continue;

        // Cek apakah ada field yang terisi
        const hasData = doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim();

        // Jika ada data, semua field harus lengkap
        if (hasData) {
          const missingFields = [];

          if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
          if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
          if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');

          if (missingFields.length > 0) {
            showError(
              'Dokumen Kontrak Kerja Tidak Lengkap',
              `Kontrak Kerja #${i + 1}: ${missingFields.join(', ')} belum diisi. Lengkapi atau hapus card ini.`
            );
            resetSubmission();
            return;
          }
        }
      }

      // ========== VALIDASI DOKUMEN JSA (OPSIONAL) ==========
      // JSA bersifat opsional, tapi jika ada yang terisi maka harus lengkap
      for (let i = 0; i < jsaDocuments.length; i++) {
        const doc = jsaDocuments[i];
        if (!doc) continue;

        // Cek apakah ada field yang terisi (JSA tidak punya subtype)
        const hasData = doc.document_number?.trim() || doc.document_date?.trim() || doc.document_upload?.trim();

        // Jika ada data, semua field harus lengkap
        if (hasData) {
          const missingFields = [];

          if (!doc.document_number?.trim()) missingFields.push('Nomor Dokumen');
          if (!doc.document_date?.trim()) missingFields.push('Tanggal Dokumen');
          if (!doc.document_upload?.trim()) missingFields.push('Upload Dokumen');

          if (missingFields.length > 0) {
            showError(
              'Dokumen JSA Tidak Lengkap',
              `JSA #${i + 1}: ${missingFields.join(', ')} belum diisi. Lengkapi atau hapus card ini.`
            );
            resetSubmission();
            return;
          }
        }
      }

      if (workers.length === 0) {
        showError('Data Pekerja Tidak Lengkap', 'Minimal harus ada satu pekerja dalam pengajuan.');
        resetSubmission();
        return;
      }

      if (workerCountInput === '') {
        showError('Jumlah Pekerja Kosong', 'Silakan isi jumlah pekerja atau klik tombol "Sesuaikan" untuk menyesuaikan dengan jumlah baris.');
        resetSubmission();
        return;
      }

      if (workers.length !== desiredCount) {
        showError('Jumlah Pekerja Tidak Sesuai', 'Jumlah baris pekerja tidak sama dengan input "Jumlah Pekerja". Klik "Sesuaikan" untuk menyamakan jumlahnya.');
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
          showError(
            'Data Pekerja Tidak Lengkap',
            `Pekerja ${i + 1} (${worker.worker_name || 'Tanpa Nama'}): Field yang belum diisi: ${missingFields.join(', ')}. Semua field wajib diisi.`
          );
          resetSubmission();
          return;
        }
      }

      const workerNames = workers.map((w) => w.worker_name.trim()).join('\n');

      // Filter hanya dokumen yang terisi lengkap (tidak kirim card kosong)
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

      // =====================
      // CLIENT-SIDE: Verify attached PDFs by fetching and validating their bytes
      // This is an extra safety gate before submitting to the server. If a file
      // cannot be downloaded or fails PDF validation, block the submission and
      // show a clear Indonesian error so the user can re-upload a valid file.
      // =====================
      const allAttachedDocs = [
        ...validSimjaDocuments.map((d) => ({ ...d, typeLabel: 'SIMJA' })),
        ...validSikaDocuments.map((d) => ({ ...d, typeLabel: 'SIKA' })),
        ...validWorkOrderDocuments.map((d) => ({ ...d, typeLabel: 'WORK_ORDER' })),
        ...validKontrakKerjaDocuments.map((d) => ({ ...d, typeLabel: 'KONTRAK_KERJA' })),
        ...validJsaDocuments.map((d) => ({ ...d, typeLabel: 'JSA' })),
      ];

      const invalidDocs = new Map<string, string>();
      let hasInvalidDoc = false;

      for (let i = 0; i < allAttachedDocs.length; i++) {
        const doc = allAttachedDocs[i];
        if (!doc || !doc.document_upload) continue;

        // Only validate PDF files (skip images)
        if (!/\.pdf(\?|$)/i.test(doc.document_upload) && !doc.document_upload.endsWith('.pdf')) continue;

        try {
          const resolvedUrl = new URL(doc.document_upload, window.location.href).toString();
          const resp = await fetch(resolvedUrl);
          if (!resp.ok) {
            const errorMsg = `Tidak dapat mengunduh dokumen. Silakan unggah ulang.`;
            invalidDocs.set(doc.id, errorMsg);
            hasInvalidDoc = true;
            continue;
          }

          const blob = await resp.blob();
          // Create a File object so our validator can operate on it
          const fileNameFromUrl = (() => {
            try {
              const u = new URL(resolvedUrl);
              return decodeURIComponent(u.pathname.split('/').pop() || `file_${i}.pdf`);
            } catch {
              return `file_${i}.pdf`;
            }
          })();

          const file = new File([blob], fileNameFromUrl, { type: blob.type || 'application/pdf' });

          const validation = await validatePDFDocument(file);
          if (!validation.isValid) {
            const errorMsg = validation.error || 'File PDF tidak valid atau rusak';
            invalidDocs.set(doc.id, errorMsg);
            hasInvalidDoc = true;
          }
        } catch (err) {
          console.error('Error while validating attached PDF:', err);
          const errorMsg = 'Gagal memeriksa dokumen. Silakan unggah ulang.';
          invalidDocs.set(doc.id, errorMsg);
          hasInvalidDoc = true;
        }
      }

      // If any documents are invalid, set state and block submission
      if (hasInvalidDoc) {
        setInvalidDocuments(invalidDocs);
        showError(
          'Dokumen PDF Bermasalah',
          'Beberapa dokumen PDF terdeteksi rusak atau tidak dapat diverifikasi. Silakan periksa highlight merah pada card dokumen dan unggah ulang file yang valid.'
        );
        resetSubmission();
        return;
      }

      const payload: SubmissionData & {
        workers: Worker[];
        simjaDocuments: SupportDoc[];
        sikaDocuments: SupportDoc[];
        workOrderDocuments: SupportDoc[];
        kontrakKerjaDocuments: SupportDoc[];
        jsaDocuments: SupportDoc[];
      } = {
        ...formData,
        worker_count: Math.max(1, desiredCount || 1),
        worker_names: workerNames,
        workers,
        simjaDocuments: validSimjaDocuments,
        sikaDocuments: validSikaDocuments,
        workOrderDocuments: validWorkOrderDocuments,
        kontrakKerjaDocuments: validKontrakKerjaDocuments,
        jsaDocuments: validJsaDocuments,
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

      showSuccess('Pengajuan Berhasil Dibuat', 'Pengajuan SIMLOK Anda telah berhasil disimpan dan akan segera diproses.', 2000);

      // Redirect ke dashboard - reset flag dan loading state di dalam timeout
      setTimeout(() => {
        router.push('/vendor');
        resetSubmission(); // Reset flag dan loading state
      }, 500);

    } catch (error) {
      console.error('Error creating submission:', error);
      const errorMessage = error instanceof Error
        ? (error.message.includes('Failed to create submission')
          ? 'Gagal membuat pengajuan. Silakan coba lagi.'
          : error.message)
        : 'Terjadi kesalahan saat menyimpan pengajuan. Silakan coba lagi.';

      showError('Gagal Membuat Pengajuan', errorMessage);
      resetSubmission(); // Reset flag dan loading untuk error case
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
              </div>
            </div>

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      disabled={isLoading}
                    >
                      <option value="">-- Pilih Dokumen Opsional --</option>
                      <option
                        value="WORK_ORDER"
                        disabled={visibleOptionalDocs.has('WORK_ORDER')}
                      >
                        Work Order {visibleOptionalDocs.has('WORK_ORDER') ? '(Sudah ditambahkan)' : ''}
                      </option>
                      <option
                        value="KONTRAK_KERJA"
                        disabled={visibleOptionalDocs.has('KONTRAK_KERJA')}
                      >
                        Kontrak Kerja {visibleOptionalDocs.has('KONTRAK_KERJA') ? '(Sudah ditambahkan)' : ''}
                      </option>
                      <option
                        value="JSA"
                        disabled={visibleOptionalDocs.has('JSA')}
                      >
                        Job Safety Analysis (JSA) {visibleOptionalDocs.has('JSA') ? '(Sudah ditambahkan)' : ''}
                      </option>
                    </select>
                  </div>
                  <Button
                    type="button"
                    onClick={addOptionalDocument}
                    disabled={!selectedOptionalDoc || isLoading}
                    className="whitespace-nowrap"
                  >
                    + Tambah Dokumen
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Pilih jenis dokumen opsional yang ingin ditambahkan, kemudian klik tombol "Tambah Dokumen"
                </p>
              </div>

              {/* Work Order Documents - Conditional */}
              {visibleOptionalDocs.has('WORK_ORDER') && (
                <div className="border border-gray-200 p-6 rounded-lg bg-white">
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="warning">
                        Dokumen Work Order bersifat opsional, tetapi jika ingin mengisi, semua field harus dilengkapi
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => removeOptionalDocument('WORK_ORDER')}
                        disabled={isLoading}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <SupportDocumentList
                    title="Dokumen Work Order (Opsional)"
                    documentType="WORK_ORDER"
                    documents={workOrderDocuments}
                    onDocumentsChange={setWorkOrderDocuments}
                    disabled={isLoading}
                    invalidDocumentIds={invalidDocuments}
                  />
                </div>
              )}

              {/* Kontrak Kerja Documents - Conditional */}
              {visibleOptionalDocs.has('KONTRAK_KERJA') && (
                <div className="border border-gray-200 p-6 rounded-lg bg-white">
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="warning">
                        Dokumen Kontrak Kerja bersifat opsional, tetapi jika ingin mengisi, semua field harus dilengkapi
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => removeOptionalDocument('KONTRAK_KERJA')}
                        disabled={isLoading}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <SupportDocumentList
                    title="Dokumen Kontrak Kerja (Opsional)"
                    documentType="KONTRAK_KERJA"
                    documents={kontrakKerjaDocuments}
                    onDocumentsChange={setKontrakKerjaDocuments}
                    disabled={isLoading}
                    invalidDocumentIds={invalidDocuments}
                  />
                </div>
              )}

              {/* JSA Documents - Conditional */}
              {visibleOptionalDocs.has('JSA') && (
                <div className="border border-gray-200 p-6 rounded-lg bg-white">
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="warning">
                        Dokumen JSA bersifat opsional, tetapi jika ingin mengisi, semua field harus dilengkapi
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => removeOptionalDocument('JSA')}
                        disabled={isLoading}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                  <SupportDocumentList
                    title="Dokumen Job Safety Analysis (Opsional)"
                    documentType="JSA"
                    documents={jsaDocuments}
                    onDocumentsChange={setJsaDocuments}
                    disabled={isLoading}
                    invalidDocumentIds={invalidDocuments}
                  />
                </div>
              )}
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
                  {/* <Badge variant="warning">
                    Jika lokasi kerja lebih dari satu, pisahkan dengan koma ( , )
                  </Badge> */}
                </div>

                <div>
                  <Label htmlFor="implementation_dates">Tanggal Pelaksanaan <span className="ml-1 text-red-500">*</span></Label>
                  <DateRangePicker
                    startDate={formData.implementation_start_date || ''}
                    endDate={formData.implementation_end_date || ''}
                    onStartDateChange={(value) =>
                      setFormData((prev) => ({ ...prev, implementation_start_date: value }))
                    }
                    onEndDateChange={(value) =>
                      setFormData((prev) => ({ ...prev, implementation_end_date: value }))
                    }
                  />
                </div>

              <div>
                <Label htmlFor="working_hours">Jam Kerja <span className="ml-1 text-red-500">*</span></Label>
                <TimeRangePicker
                  id="working_hours"
                  name="working_hours"
                  value={formData.working_hours}
                  onChange={handleTimeChange}
                  required
                  placeholder="Pilih jam kerja"
                />
              </div>

              {/* Conditional field for holiday working hours */}
              {hasWeekend && (
                <div>
                  <Label htmlFor="holiday_working_hours">
                    Jam Kerja Hari Libur (Sabtu/Minggu)
                    <span className="ml-1 text-red-500">*</span>
                  </Label>
                  <TimeRangePicker
                    id="holiday_working_hours"
                    name="holiday_working_hours"
                    value={formData.holiday_working_hours || ''}
                    onChange={handleHolidayTimeChange}
                    placeholder="Pilih jam kerja untuk hari libur"
                    required
                  />                  </div>
                )}

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
                        if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase())) return;
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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${rowsMismatch ? 'border-amber-300' : 'border-gray-300'
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
                              placeholder="Contoh: 2024/V (angka romawi)/001"
                              required
                            />
                          </div>

                          {/* Tanggal Berlaku HSSE */}
                          <div>
                            <Label htmlFor={`hsse_valid_${w.id}`}>Masa Berlaku HSSE Pass Sampai Dengan<span className="ml-1 text-red-500">*</span></Label>
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
                              uploadType="hsse-worker"
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



