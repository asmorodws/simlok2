'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import DatePicker from '@/components/form/DatePicker';
import DateRangePicker from '@/components/form/DateRangePicker';
import TimeRangePicker from '@/components/form/TimeRangePicker';
import EnhancedFileUpload from '@/components/form/EnhancedFileUpload';
import Alert from '@/components/ui/alert/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import SupportDocumentList, { SupportDoc } from '@/components/submissions/SupportDocumentList';
import { useToast } from '@/hooks/useToast';
import { hasWeekendInRange } from '@/utils/dateHelpers';

// Define Worker interface for dynamic inputs
interface Worker {
  id: string;
  worker_name: string;
  worker_photo: string;
  hsse_pass_number?: string;
  hsse_pass_valid_thru?: string;
  hsse_pass_document_upload?: string;
}

interface WorkerAPIResponse {
  id: string;
  worker_name: string;
  worker_photo: string;
  hsse_pass_number?: string;
  hsse_pass_valid_thru?: string | Date;
  hsse_pass_document_upload?: string;
}

interface SupportDocumentAPI {
  id: string;
  document_type: string;
  document_subtype?: string;
  document_number: string;
  document_date: string | Date;
  document_upload: string;
}

interface Submission {
  id: string;
  approval_status: string;
  review_status?: string;
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  holiday_working_hours?: string | null;
  other_notes?: string | null;
  work_facilities: string;
  worker_count?: number | null;
  simja_number?: string | null;
  simja_date?: Date | null;
  sika_number?: string | null;
  sika_date?: Date | null;
  worker_names: string;
  content: string | null;
  sika_document_upload?: string | null;
  simja_document_upload?: string | null;
  implementation_start_date?: Date | null;
  implementation_end_date?: Date | null;
  note_for_vendor?: string | null;  // Reviewer notes for revision
}

interface EditSubmissionFormProps {
  submissionId: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function EditSubmissionForm({ submissionId, isOpen = true, onClose }: EditSubmissionFormProps) {
  const router = useRouter();
  const { data: session, status: _status } = useSession();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string } | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);

  // State for implementation dates and weekend detection
  const [implementationDates, setImplementationDates] = useState({
    startDate: '',
    endDate: ''
  });
  const [hasWeekend, setHasWeekend] = useState(false);

  // State for dynamic workers
  const [workers, setWorkers] = useState<Worker[]>([
    {
      id: '1',
      worker_name: '',
      worker_photo: '',
      hsse_pass_number: '',
      hsse_pass_valid_thru: '',
      hsse_pass_document_upload: ''
    }
  ]);

  // Worker count management
  const [desiredCount, setDesiredCount] = useState<number>(1);
  const [workerCountInput, setWorkerCountInput] = useState<string>('1');

  // Bulk add workers
  const [showBulk, setShowBulk] = useState(false);
  const [bulkNames, setBulkNames] = useState('');

  // Ref for autofocus
  const lastAddedRef = useRef<HTMLInputElement | null>(null);

  // Support Documents state
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
      document_subtype: '',
      document_number: '',
      document_date: '',
      document_upload: '',
    },
  ]);

  // Visible optional documents state
  const [visibleOptionalDocs, setVisibleOptionalDocs] = useState<Set<string>>(new Set());
  const [selectedOptionalDoc, setSelectedOptionalDoc] = useState<string>('');

  // Track invalid documents (untuk future use)
  const [invalidDocuments] = useState<Map<string, string>>(new Map());

  // Prevent double submission
  const isSubmittingRef = useRef(false);

  // Load submission data
  useEffect(() => {
    const fetchSubmission = async () => {
      setIsInitialLoading(true);
      try {
        const response = await fetch(`/api/submissions/${submissionId}`);
        if (response.ok) {
          const responseData = await response.json();
          console.log('📋 Full API response:', responseData);

          // Extract submission from response
          const data = responseData.submission || responseData;

          console.log('📋 Loaded submission data:', {
            id: data.id,
            approval_status: data.approval_status,
            review_status: data.review_status,
            note_for_vendor: data.note_for_vendor
          });
          setSubmission(data);

          // Fetch workers data
          const workersResponse = await fetch(`/api/submissions/${submissionId}/workers`);
          if (workersResponse.ok) {
            const workersData = await workersResponse.json();
            if (workersData.workers && workersData.workers.length > 0) {
              const loadedWorkers = workersData.workers.map((worker: WorkerAPIResponse) => ({
                id: worker.id,
                worker_name: worker.worker_name || '',
                worker_photo: worker.worker_photo || '',
                hsse_pass_number: worker.hsse_pass_number || '',
                hsse_pass_valid_thru: worker.hsse_pass_valid_thru ? (() => {
                  const date = new Date(worker.hsse_pass_valid_thru);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                })() : '',
                hsse_pass_document_upload: worker.hsse_pass_document_upload || ''
              }));
              setWorkers(loadedWorkers);
              // Update worker count to match loaded workers
              setWorkerCountInput(String(loadedWorkers.length));
              setDesiredCount(loadedWorkers.length);
            }
          }

          // Fetch support documents
          if (data.support_documents && data.support_documents.length > 0) {
            const simja: SupportDoc[] = [];
            const sika: SupportDoc[] = [];
            const workOrder: SupportDoc[] = [];
            const kontrak: SupportDoc[] = [];
            const jsa: SupportDoc[] = [];
            const visibleOpt = new Set<string>();

            data.support_documents.forEach((doc: SupportDocumentAPI) => {
              const formatted: SupportDoc = {
                id: doc.id,
                document_subtype: doc.document_subtype || '',
                document_number: doc.document_number || '',
                document_date: doc.document_date ? (() => {
                  const date = new Date(doc.document_date);
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}`;
                })() : '',
                document_upload: doc.document_upload || '',
              };

              switch (doc.document_type) {
                case 'SIMJA':
                  simja.push(formatted);
                  break;
                case 'SIKA':
                  sika.push(formatted);
                  break;
                case 'WORK_ORDER':
                  workOrder.push(formatted);
                  visibleOpt.add('WORK_ORDER');
                  break;
                case 'KONTRAK_KERJA':
                  kontrak.push(formatted);
                  visibleOpt.add('KONTRAK_KERJA');
                  break;
                case 'JSA':
                  jsa.push(formatted);
                  visibleOpt.add('JSA');
                  break;
              }
            });

            if (simja.length > 0) setSimjaDocuments(simja);
            if (sika.length > 0) setSikaDocuments(sika);
            if (workOrder.length > 0) setWorkOrderDocuments(workOrder);
            if (kontrak.length > 0) setKontrakKerjaDocuments(kontrak);
            if (jsa.length > 0) setJsaDocuments(jsa);
            setVisibleOptionalDocs(visibleOpt);
          }
        } else {
          setAlert({
            variant: 'error',
            title: 'Error!',
            message: 'Gagal memuat data pengajuan'
          });
        }
      } catch (error) {
        console.error('Error fetching submission:', error);
        setAlert({
          variant: 'error',
          title: 'Error!',
          message: 'Gagal memuat data pengajuan'
        });
      } finally {
        setIsInitialLoading(false);
      }
    };

    if (submissionId) {
      fetchSubmission();
    }
  }, [submissionId]);

  const [formData, setFormData] = useState({
    nama_vendor: '',
    berdasarkan: '',
    nama_petugas: '',
    pekerjaan: '',
    lokasi_kerja: '',
    pelaksanaan: '',
    jam_kerja: '',
    jam_kerja_libur: '',
    lain_lain: '',
    sarana_kerja: '',
    jumlah_pekerja: 0,
    nomor_simja: '',
    tanggal_simja: '',
    nomor_sika: '',
    tanggal_sika: '',
    nama_pekerja: '',
    content: '',
    upload_doc_sika: '',
    upload_doc_simja: '',
  });

  // Update form data when submission is loaded
  useEffect(() => {
    if (submission) {
      // Format dates for implementation
      const startDate = submission.implementation_start_date ? (() => {
        const date = new Date(submission.implementation_start_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })() : '';

      const endDate = submission.implementation_end_date ? (() => {
        const date = new Date(submission.implementation_end_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })() : '';

      setImplementationDates({ startDate, endDate });

      setFormData({
        nama_vendor: submission.vendor_name || '',
        berdasarkan: submission.based_on || '',
        nama_petugas: submission.officer_name || '',
        pekerjaan: submission.job_description || '',
        lokasi_kerja: submission.work_location || '',
        pelaksanaan: submission.implementation || '',
        jam_kerja: submission.working_hours || '',
        jam_kerja_libur: submission.holiday_working_hours || '',
        lain_lain: submission.other_notes || '',
        sarana_kerja: submission.work_facilities || '',
        jumlah_pekerja: submission.worker_count || 0,
        nomor_simja: submission.simja_number || '',
        tanggal_simja: submission.simja_date ? (() => {
          const date = new Date(submission.simja_date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : '',
        nomor_sika: submission.sika_number || '',
        tanggal_sika: submission.sika_date ? (() => {
          const date = new Date(submission.sika_date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : '',
        nama_pekerja: submission.worker_names || '',
        content: submission.content || '',
        upload_doc_sika: submission.sika_document_upload || '',
        upload_doc_simja: submission.simja_document_upload || '',
      });
    }
  }, [submission]);

  // Auto-fill form data when session is available (for readonly fields)
  useEffect(() => {
    if (session?.user && submission) {
      setFormData(prev => ({
        ...prev,
        // Keep vendor name readonly for vendors - use session data if available
        nama_vendor: session.user.vendor_name || submission.vendor_name || prev.nama_vendor || '',
      }));
    }
  }, [session, submission]);

  // Detect weekend when implementation dates change
  useEffect(() => {
    if (implementationDates.startDate && implementationDates.endDate) {
      const hasWeekendDays = hasWeekendInRange(
        implementationDates.startDate,
        implementationDates.endDate
      );
      setHasWeekend(hasWeekendDays);
    } else {
      setHasWeekend(false);
    }
  }, [implementationDates]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
    }));
  };

  const handleTimeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      jam_kerja: value
    }));
  };

  const handleHolidayTimeChange = (value: string) => {
    setFormData(prev => ({ ...prev, jam_kerja_libur: value }));
  };

  // Functions for managing dynamic workers
  const addWorker = () => {
    const newWorker: Worker = {
      id: Date.now().toString(),
      worker_name: '',
      worker_photo: '',
      hsse_pass_number: '',
      hsse_pass_valid_thru: '',
      hsse_pass_document_upload: ''
    };
    setWorkers(prev => [...prev, newWorker]);
  };

  const removeWorker = (id: string) => {
    if (workers.length > 1) {
      setWorkers(prev => prev.filter(worker => worker.id !== id));
    }
  };

  const updateWorkerName = (id: string, name: string) => {
    setWorkers(prev => prev.map(worker =>
      worker.id === id ? { ...worker, worker_name: name } : worker
    ));
  };

  const updateWorkerPhoto = (id: string, url: string) => {
    setWorkers(prev => prev.map(worker =>
      worker.id === id ? { ...worker, worker_photo: url } : worker
    ));
  };

  const updateWorkerHsseNumber = (id: string, value: string) => {
    setWorkers(prev => prev.map(worker =>
      worker.id === id ? { ...worker, hsse_pass_number: value } : worker
    ));
  };

  const updateWorkerHsseValidThru = (id: string, value: string) => {
    setWorkers(prev => prev.map(worker =>
      worker.id === id ? { ...worker, hsse_pass_valid_thru: value } : worker
    ));
  };

  const updateWorkerHsseDocument = (id: string, url: string) => {
    setWorkers(prev => prev.map(worker =>
      worker.id === id ? { ...worker, hsse_pass_document_upload: url } : worker
    ));
  };

  // Focus on last added worker
  const focusLastAdded = () => {
    setTimeout(() => {
      lastAddedRef.current?.focus();
    }, 100);
  };

  // Apply desired worker count (add or remove workers to match count)
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

  // Add multiple workers from bulk input
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

  // Check if worker count matches input
  const rowsMismatch = workerCountInput !== '' && workers.length !== Number(workerCountInput);

  // Optional Documents Handlers
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Tampilkan modal konfirmasi
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);

    // Check if submission is loaded
    if (!submission) {
      setAlert({
        variant: 'error',
        title: 'Error!',
        message: 'Data pengajuan belum dimuat'
      });
      return;
    }

    // Check if submission is still editable
    // Allow edit if:
    // 1. PENDING_APPROVAL (belum direview)
    // 2. PENDING_APPROVAL + NOT_MEETS_REQUIREMENTS (perlu perbaikan)
    const isEditable = submission.approval_status === 'PENDING_APPROVAL' &&
      (submission.review_status === 'PENDING_REVIEW' ||
        submission.review_status === 'NOT_MEETS_REQUIREMENTS');

    // console.log('🔍 Editable check:', {
    //   approval_status: submission.approval_status,
    //   review_status: submission.review_status,
    //   isEditable: isEditable
    // });

    if (!isEditable) {
      setAlert({
        variant: 'warning',
        title: 'Peringatan!',
        message: 'Tidak dapat mengubah pengajuan yang sudah diproses oleh admin.'
      });
      return;
    }

    // PREVENT DOUBLE SUBMISSION
    if (isSubmittingRef.current) {
      console.warn('⚠️ Submission already in progress');
      return;
    }
    isSubmittingRef.current = true;
    setIsLoading(true);

    const resetSubmission = () => {
      isSubmittingRef.current = false;
      setIsLoading(false);
    };

    try {
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

      // ========== VALIDASI WORKERS ==========
      if (workers.length === 0) {
        showError('Data Pekerja Tidak Lengkap', 'Minimal harus ada satu pekerja.');
        resetSubmission();
        return;
      }

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
      const formattedData = {
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

      // console.log('Sending update request:', {
      //   url: `/api/submissions/${submission.id}`,
      //   method: 'PUT',
      //   data: formattedData
      // });

      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      // console.log('Response status:', response.status);
      // console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);

        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || 'Gagal menyimpan perubahan';
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        setAlert({
          variant: 'error',
          title: 'Error!',
          message: `Error: ${errorMessage}`
        });
        showError('Gagal Menyimpan', errorMessage);
        return;
      }

      await response.json();
      // console.log('Update successful:', result);

      // If submission needs revision (NOT_MEETS_REQUIREMENTS), call resubmit endpoint
      if (submission.review_status === 'NOT_MEETS_REQUIREMENTS' && submission.approval_status === 'PENDING_APPROVAL') {
        // console.log('Submission needs revision, calling resubmit endpoint...');

        try {
          const resubmitResponse = await fetch(`/api/submissions/${submission.id}/resubmit`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (resubmitResponse.ok) {
            // console.log('Resubmit successful');
            showSuccess('Berhasil!', 'Pengajuan telah diperbaiki dan dikirim ulang untuk direview!');
          } else {
            console.error('Resubmit failed:', await resubmitResponse.text());
            showSuccess('Berhasil!', 'Perubahan berhasil disimpan!');
          }
        } catch (resubmitError) {
          console.error('Resubmit error:', resubmitError);
          showSuccess('Berhasil!', 'Perubahan berhasil disimpan!');
        }
      } else {
        // Normal update for PENDING_REVIEW
        showSuccess('Berhasil!', 'Perubahan berhasil disimpan!');
      }

      // If modal mode, call onClose, otherwise redirect
      if (onClose) {
        onClose();
      } else {
        router.push('/vendor/submissions');
      }
    } catch (error) {
      console.error('Network/unexpected error:', error);

      let errorMessage = 'Terjadi kesalahan tidak terduga';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setAlert({
        variant: 'error',
        title: 'Error!',
        message: `Gagal menyimpan perubahan: ${errorMessage}`
      });
      showError('Error!', `Gagal menyimpan perubahan: ${errorMessage}`);
    } finally {
      resetSubmission();
    }
  };

  // Don't render if modal is closed
  if (!isOpen) return null;

  return (
    <div className="mx-auto p-6 max-w-7xl">
      {isInitialLoading ? (
        <Card>
          <div className="p-6 text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Memuat data pengajuan...</p>
          </div>
        </Card>
      ) : !submission ? (
        <Card>
          <div className="p-6 text-center">
            <p className="text-red-600">Data pengajuan tidak ditemukan</p>
          </div>
        </Card>
      ) : (
        <div className="flex gap-6 items-start">
          {/* Main Form - Left Side */}
          <Card className="flex-1">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="text-sm text-gray-500">
                  Status: <span className={`font-medium ${submission.approval_status === 'PENDING_APPROVAL' && submission.review_status === 'NOT_MEETS_REQUIREMENTS' ? 'text-orange-600' :
                      submission.approval_status === 'PENDING_APPROVAL' ? 'text-yellow-600' :
                        submission.approval_status === 'APPROVED' ? 'text-green-600' :
                          'text-red-600'
                    }`}>{
                      submission.approval_status === 'PENDING_APPROVAL' && submission.review_status === 'NOT_MEETS_REQUIREMENTS' ? 'Tidak Memenuhi Syarat - Perlu Perbaikan' :
                        submission.approval_status === 'PENDING_APPROVAL' ? 'Menunggu Review' :
                          submission.approval_status === 'APPROVED' ? 'Disetujui' :
                            submission.approval_status === 'REJECTED' ? 'Ditolak' :
                              submission.approval_status
                    }</span>
                </div>
              </div>

              {/* Warning jika tidak bisa diedit */}
              {!(submission.approval_status === 'PENDING_APPROVAL' &&
                (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS')) && (
                  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      <span className="font-medium">Peringatan:</span> Pengajuan ini sudah diproses oleh admin dan tidak dapat diubah.
                      Anda hanya dapat melihat detailnya saja.
                    </p>
                  </div>
                )}

              <form onSubmit={handleSubmit} className="space-y-8">
                <fieldset
                  disabled={!(submission.approval_status === 'PENDING_APPROVAL' &&
                    (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                  className={!(submission.approval_status === 'PENDING_APPROVAL' &&
                    (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS')) ? 'opacity-60' : ''}
                >

                  {/* Informasi Vendor */}
                  <div className="p-6 rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">Informasi Vendor</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="nama_vendor">Nama vendor</Label>
                        <Input
                          id="nama_vendor"
                          name="nama_vendor"
                          value={session?.user?.vendor_name || formData.nama_vendor || ''}
                          onChange={handleChange}
                          type="text"
                          required
                          disabled={!!session?.user?.vendor_name}
                          placeholder="PT. Nama Perusahaan"
                          className={session?.user?.vendor_name ? "cursor-not-allowed" : ""}
                        />
                      </div>

                      <div>
                        <Label htmlFor="nama_petugas">Nama petugas</Label>
                        <Input
                          id="nama_petugas"
                          name="nama_petugas"
                          value={formData.nama_petugas}
                          onChange={handleChange}
                          type="text"
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
                        disabled={isLoading || !(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
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
                        disabled={isLoading || !(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                        invalidDocumentIds={invalidDocuments}
                      />
                    </div>

                    {/* Add Optional Document Selector */}
                    {(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS')) && (
                      <div className="border border-gray-200 p-6 rounded-lg bg-blue-50">
                        <h3 className="text-base font-semibold text-gray-900 mb-4">Tambah Dokumen Opsional</h3>
                        <div className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label htmlFor="optional_doc_select">Pilih Jenis Dokumen</Label>
                            <select
                              id="optional_doc_select"
                              value={selectedOptionalDoc}
                              onChange={(e) => setSelectedOptionalDoc(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="text-red-600 border-red-200 hover:bg-red-50"
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
                            className="text-red-600 border-red-200 hover:bg-red-50"
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
                            className="text-red-600 border-red-200 hover:bg-red-50"
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

                  {/* Informasi Pekerjaan */}
                  <div className="p-6 rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">Informasi Pekerjaan</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="pekerjaan">Pekerjaan</Label>
                        <Input
                          id="pekerjaan"
                          name="pekerjaan"
                          value={formData.pekerjaan}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="lokasi_kerja">Lokasi kerja</Label>
                        <Input
                          id="lokasi_kerja"
                          name="lokasi_kerja"
                          value={formData.lokasi_kerja}
                          onChange={handleChange}
                          required
                        />
                      </div>

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

                      <div>
                        <Label htmlFor="jam_kerja">Jam kerja <span className="text-red-500">*</span></Label>
                        <TimeRangePicker
                          id="jam_kerja"
                          name="jam_kerja"
                          value={formData.jam_kerja}
                          onChange={handleTimeChange}
                          required
                          placeholder="Pilih jam kerja"
                          disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                        />
                      </div>

                      {/* Conditional field for holiday working hours */}
                      {hasWeekend && (
                        <div>
                          <Label htmlFor="jam_kerja_libur">
                            Jam kerja hari libur (Sabtu/Minggu)
                            <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <TimeRangePicker
                            id="jam_kerja_libur"
                            name="jam_kerja_libur"
                            value={formData.jam_kerja_libur || ''}
                            onChange={handleHolidayTimeChange}
                            required
                            placeholder="Pilih jam kerja untuk hari libur"
                            disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                          />
                        </div>
                      )}

                      <div>
                        <Label htmlFor="sarana_kerja">Sarana kerja</Label>
                        <Input
                          id="sarana_kerja"
                          name="sarana_kerja"
                          value={formData.sarana_kerja}
                          onChange={handleChange}
                          placeholder="Contoh: Toolkit lengkap, APD standar, crane mobile"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Daftar Pekerja */}
                  <div className="p-6 rounded-lg">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-3">
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
                            disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                          />
                        </div>

                        <div className="flex gap-2 flex-shrink-0 whitespace-nowrap">
                          <Button
                            type="button"
                            onClick={() => addWorker()}
                            className="whitespace-nowrap"
                            disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                          >
                            + Tambah
                          </Button>
                          {rowsMismatch && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={applyDesiredCount}
                              className="whitespace-nowrap"
                              disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                            >
                              Sesuaikan
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant={showBulk ? 'destructive' : 'outline'}
                            onClick={() => setShowBulk((s) => !s)}
                            className="whitespace-nowrap"
                            disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
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
                          disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            type="button"
                            onClick={addBulkWorkers}
                            disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                          >
                            Tambahkan
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkNames('')}
                            disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
                          >
                            Bersihkan
                          </Button>
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
                                disabled={workers.length <= 1 || !(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
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
                                    disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
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
                                    disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
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
                                    disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
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
                                    disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
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
                                    disabled={!(submission.approval_status === 'PENDING_APPROVAL' && (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS'))}
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
                        <li>Pastikan dokumen HSSE Pass masih berlaku</li>
                      </ul>
                    </div>
                  </div>

                </fieldset>

                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                  >
                    Batal
                  </Button>
                  {(submission.approval_status === 'PENDING_APPROVAL' &&
                    (submission.review_status === 'PENDING_REVIEW' || submission.review_status === 'NOT_MEETS_REQUIREMENTS')) && (
                      <Button
                        type="submit"
                        disabled={isLoading}
                      >
                        {isLoading ? 'Menyimpan...' :
                          submission.review_status === 'NOT_MEETS_REQUIREMENTS' ? 'Submit perubahan' :
                            'Simpan Perubahan'}
                      </Button>
                    )}
                </div>
              </form>

              {/* Alert */}
              {alert && (
                <Alert
                  variant={alert.variant}
                  title={alert.title}
                  message={alert.message}
                />
              )}
            </div>
          </Card>

          {/* Sticky Notes Panel - Right Side */}
          {submission.review_status === 'NOT_MEETS_REQUIREMENTS' && submission.note_for_vendor && (
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-6">
                <div className="bg-white border border-blue-200 rounded-lg shadow-lg overflow-hidden">
                  {/* Header with blue accent */}
                  <div className="bg-blue-500 px-4 py-3 flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white">
                        Catatan dari Reviewer
                      </h3>
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="p-4">
                    <div className="mb-3">
                    </div>
                    <div className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 max-h-96 overflow-y-auto">
                      {submission.note_for_vendor}
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-900">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="leading-relaxed">
                        Perbaiki sesuai catatan
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Konfirmasi */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Konfirmasi Perbaikan SIMLOK
            </h3>
            <p className="text-gray-600 mb-6">
              Apakah perbaikan sudah sesuai dengan catatan?
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Mengirim...' : 'Ya, Kirim Ulang'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
