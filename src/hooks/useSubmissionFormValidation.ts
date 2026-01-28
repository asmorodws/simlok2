/**
 * Shared validation hook for Submission Forms
 */

import { useState } from 'react';
import { Worker, SupportDoc } from '@/components/features/submission/form/SubmissionFormShared';

interface FormData {
  organization_unit: string;
  division: string;
  location: string;
  qr_code: string;
  coordinator_officer: string;
  area_purpose: string;
  implementation_date_from: string;
  implementation_date_to: string;
  implementation_time_from: string;
  implementation_time_to: string;
  work_description: string;
  simlok_number: string;
  vendor_name: string;
  vendor_pic_name: string;
  vendor_pic_phone: string;
  vendor_superintendent: string;
  vendor_superintendent_phone: string;
  pelaksanaan?: string;
}

interface UseSubmissionFormValidationReturn {
  errors: Record<string, string>;
  validateForm: (
    data: FormData,
    workers: Worker[],
    simja: SupportDoc[],
    sika: SupportDoc[]
  ) => boolean;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
}

export function useSubmissionFormValidation(): UseSubmissionFormValidationReturn {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const clearAllErrors = () => {
    setErrors({});
  };

  const validateForm = (
    data: FormData,
    workers: Worker[],
    simja: SupportDoc[],
    sika: SupportDoc[]
  ): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!data.organization_unit?.trim()) {
      newErrors.organization_unit = 'Unit Organisasi wajib diisi';
    }
    if (!data.division?.trim()) {
      newErrors.division = 'Divisi wajib diisi';
    }
    if (!data.location?.trim()) {
      newErrors.location = 'Lokasi wajib diisi';
    }
    if (!data.qr_code?.trim()) {
      newErrors.qr_code = 'QR Code wajib diisi';
    }
    if (!data.coordinator_officer?.trim()) {
      newErrors.coordinator_officer = 'Petugas Koordinator wajib diisi';
    }
    if (!data.area_purpose?.trim()) {
      newErrors.area_purpose = 'Tujuan Area wajib diisi';
    }
    if (!data.implementation_date_from?.trim()) {
      newErrors.implementation_date_from = 'Tanggal mulai wajib diisi';
    }
    if (!data.implementation_date_to?.trim()) {
      newErrors.implementation_date_to = 'Tanggal selesai wajib diisi';
    }
    if (!data.implementation_time_from?.trim()) {
      newErrors.implementation_time_from = 'Waktu mulai wajib diisi';
    }
    if (!data.implementation_time_to?.trim()) {
      newErrors.implementation_time_to = 'Waktu selesai wajib diisi';
    }
    if (!data.work_description?.trim()) {
      newErrors.work_description = 'Uraian Pekerjaan wajib diisi';
    }
    if (!data.vendor_name?.trim()) {
      newErrors.vendor_name = 'Nama Vendor wajib diisi';
    }
    if (!data.vendor_pic_name?.trim()) {
      newErrors.vendor_pic_name = 'Nama PIC Vendor wajib diisi';
    }
    if (!data.vendor_pic_phone?.trim()) {
      newErrors.vendor_pic_phone = 'No. Telp PIC Vendor wajib diisi';
    }
    if (!data.vendor_superintendent?.trim()) {
      newErrors.vendor_superintendent = 'Nama Pengawas Vendor wajib diisi';
    }
    if (!data.vendor_superintendent_phone?.trim()) {
      newErrors.vendor_superintendent_phone = 'No. Telp Pengawas Vendor wajib diisi';
    }

    // Date validation
    if (data.implementation_date_from && data.implementation_date_to) {
      const from = new Date(data.implementation_date_from);
      const to = new Date(data.implementation_date_to);
      if (from > to) {
        newErrors.implementation_date_to = 'Tanggal selesai harus setelah tanggal mulai';
      }
    }

    // Time validation
    if (data.implementation_time_from && data.implementation_time_to) {
      const fromParts = data.implementation_time_from.split(':').map(Number);
      const toParts = data.implementation_time_to.split(':').map(Number);
      
      if (fromParts.length === 2 && toParts.length === 2) {
        const fromHour = fromParts[0];
        const fromMin = fromParts[1];
        const toHour = toParts[0];
        const toMin = toParts[1];
        
        if (fromHour !== undefined && fromMin !== undefined && toHour !== undefined && toMin !== undefined) {
          const fromMinutes = fromHour * 60 + fromMin;
          const toMinutes = toHour * 60 + toMin;
          
          if (fromMinutes >= toMinutes) {
            newErrors.implementation_time_to = 'Waktu selesai harus setelah waktu mulai';
          }
        }
      }
    }

    // Workers validation
    const filledWorkers = workers.filter(w => w.worker_name?.trim());
    if (filledWorkers.length === 0) {
      newErrors.workers = 'Minimal harus ada 1 pekerja';
    }

    // Validate each worker
    filledWorkers.forEach((worker, index) => {
      if (!worker.worker_photo?.trim()) {
        newErrors[`worker_photo_${index}`] = `Foto pekerja ${index + 1} wajib diunggah`;
      }
    });

    // SIMJA validation
    const filledSimja = simja.filter(doc => 
      doc.document_number?.trim() || 
      doc.document_date?.trim() || 
      doc.document_upload?.trim()
    );
    if (filledSimja.length === 0) {
      newErrors.simja = 'Minimal harus ada 1 dokumen SIMJA';
    }

    // Validate each SIMJA
    filledSimja.forEach((doc, index) => {
      if (!doc.document_number?.trim()) {
        newErrors[`simja_number_${index}`] = `Nomor SIMJA ${index + 1} wajib diisi`;
      }
      if (!doc.document_date?.trim()) {
        newErrors[`simja_date_${index}`] = `Tanggal SIMJA ${index + 1} wajib diisi`;
      }
      if (!doc.document_upload?.trim()) {
        newErrors[`simja_upload_${index}`] = `File SIMJA ${index + 1} wajib diunggah`;
      }
    });

    // SIKA validation
    const filledSika = sika.filter(doc => 
      doc.document_number?.trim() || 
      doc.document_date?.trim() || 
      doc.document_upload?.trim()
    );
    if (filledSika.length === 0) {
      newErrors.sika = 'Minimal harus ada 1 dokumen SIKA';
    }

    // Validate each SIKA
    filledSika.forEach((doc, index) => {
      if (!doc.document_number?.trim()) {
        newErrors[`sika_number_${index}`] = `Nomor SIKA ${index + 1} wajib diisi`;
      }
      if (!doc.document_date?.trim()) {
        newErrors[`sika_date_${index}`] = `Tanggal SIKA ${index + 1} wajib diisi`;
      }
      if (!doc.document_upload?.trim()) {
        newErrors[`sika_upload_${index}`] = `File SIKA ${index + 1} wajib diunggah`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    errors,
    validateForm,
    clearError,
    clearAllErrors
  };
}
