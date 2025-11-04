import { useState, useCallback, useMemo } from 'react';

export interface ImplementationDates {
  startDate: string;
  endDate: string;
}

export interface ImplementationTemplate {
  pelaksanaan: string;
  lainLain: string;
}

export interface UseImplementationDatesOptions {
  // Legacy fields (keeping for backward compatibility during transition)
  simjaNumber?: string | undefined;
  simjaDate?: string | undefined;
  sikaNumber?: string | undefined;
  sikaDate?: string | undefined;
  
  // New supporting documents fields
  supportingDoc1Type?: string | undefined;
  supportingDoc1Number?: string | undefined;
  supportingDoc1Date?: string | undefined;
  supportingDoc2Type?: string | undefined;
  supportingDoc2Number?: string | undefined;
  supportingDoc2Date?: string | undefined;
  
  signerPosition?: string;
  initialDates?: ImplementationDates;
}

export interface UseImplementationDatesReturn {
  dates: ImplementationDates;
  template: ImplementationTemplate;
  errors: {
    startDate?: string;
    endDate?: string;
  };
  isValid: boolean;
  duration: number | null;
  updateStartDate: (date: string) => void;
  updateEndDate: (date: string) => void;
  updateDates: (dates: ImplementationDates) => void;
  getData: () => { startDate: string; endDate: string; pelaksanaan: string };
  reset: () => void;
}

/**
 * Custom hook untuk mengelola tanggal pelaksanaan dan generate template otomatis
 * Hook ini menangani semua logic terkait tanggal pelaksanaan dengan clean separation of concerns
 */
export function useImplementationDates({
  // Legacy support
  simjaNumber = '',
  simjaDate = '',
  sikaNumber = '',
  sikaDate = '',
  
  // New supporting documents support
  supportingDoc1Type = '',
  supportingDoc1Number = '',
  supportingDoc1Date = '',
  supportingDoc2Type = '',
  supportingDoc2Number = '',
  supportingDoc2Date = '',
  
  signerPosition = 'Sr Officer Security III',
  initialDates = { startDate: '', endDate: '' }
}: UseImplementationDatesOptions = {}): UseImplementationDatesReturn {
  
  const [dates, setDates] = useState<ImplementationDates>(initialDates);

  // Validate individual date
  const validateDate = useCallback((dateStr: string): string | undefined => {
    if (!dateStr) return undefined;
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Format tanggal tidak valid';
      }
      
      // Check if date is in the past (optional validation)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (date < today) {
        return 'Tanggal tidak boleh di masa lalu';
      }
      
      return undefined;
    } catch (error) {
      return 'Format tanggal tidak valid';
    }
  }, []);

  // Validate date range
  const errors = useMemo(() => {
    const result: { startDate?: string; endDate?: string } = {};
    
    // Validate start date
    const startError = validateDate(dates.startDate);
    if (startError) {
      result.startDate = startError;
    }
    
    // Validate end date
    const endError = validateDate(dates.endDate);
    if (endError) {
      result.endDate = endError;
    }
    
    // Validate range if both dates are valid
    if (!startError && !endError && dates.startDate && dates.endDate) {
      const startDate = new Date(dates.startDate);
      const endDate = new Date(dates.endDate);
      
      if (endDate < startDate) {
        result.endDate = 'Tanggal selesai harus setelah tanggal mulai';
      }
      
      // Check if range is reasonable (not more than 1 year)
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        result.endDate = 'Periode pelaksanaan tidak boleh lebih dari 1 tahun';
      }
    }
    
    return result;
  }, [dates, validateDate]);

  // Check if dates are valid
  const isValid = useMemo(() => {
    return dates.startDate !== '' && 
           dates.endDate !== '' && 
           Object.keys(errors).length === 0;
  }, [dates, errors]);

  // Calculate duration in days
  const duration = useMemo((): number | null => {
    if (!dates.startDate || !dates.endDate || !isValid) {
      return null;
    }
    
    try {
      const startDate = new Date(dates.startDate);
      const endDate = new Date(dates.endDate);
      
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both dates
      
      return diffDays > 0 ? diffDays : null;
    } catch (error) {
      return null;
    }
  }, [dates, isValid]);

  // Format date for Indonesian locale
  const formatDateIndonesian = useCallback((dateStr: string): string => {
    if (!dateStr) return '[tanggal]';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '[tanggal]';
      
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return '[tanggal]';
    }
  }, []);

  // Generate pelaksanaan template
  const pelaksanaanTemplate = useMemo((): string => {
    if (!dates.startDate || !dates.endDate || !isValid) {
      return '';
    }
    
    const startDateFormatted = formatDateIndonesian(dates.startDate);
    const endDateFormatted = formatDateIndonesian(dates.endDate);
    
    return `Terhitung mulai tanggal ${startDateFormatted} sampai ${endDateFormatted}. Termasuk hari Sabtu, Minggu dan hari libur lainnya.`;
  }, [dates, isValid, formatDateIndonesian]);

  // Generate lain-lain template with supporting documents
  const lainLainTemplate = useMemo((): string => {
    if (!dates.startDate || !dates.endDate || !isValid) {
      return '';
    }

    const templateParts: string[] = [];
    
    // Header
    templateParts.push('Izin diberikan berdasarkan :');
    
    // Use supporting documents if available, fallback to legacy SIMJA/SIKA
    const doc1Type = supportingDoc1Type || (simjaNumber ? 'SIMJA' : '');
    const doc1Number = supportingDoc1Number || simjaNumber;
    const doc1Date = supportingDoc1Date || simjaDate;
    
    const doc2Type = supportingDoc2Type || (sikaNumber ? 'SIKA' : '');
    const doc2Number = supportingDoc2Number || sikaNumber;
    const doc2Date = supportingDoc2Date || sikaDate;
    
    // Document 1 section
    if (doc1Type && doc1Number && doc1Date) {
      const doc1DateFormatted = formatDateIndonesian(doc1Date);
      templateParts.push(
        `• <strong>${doc1Type}</strong>`,
        `  <strong>No. ${doc1Number}</strong> <strong>Tanggal ${doc1DateFormatted}</strong>`
      );
    } else if (doc1Type || doc1Number || doc1Date) {
      const docType = doc1Type || 'Dokumen Perizinan';
      const docNumber = doc1Number || '[nomor]';
      const docDate = doc1Date ? formatDateIndonesian(doc1Date) : '[tanggal]';
      templateParts.push(
        `• <strong>${docType}</strong>`,
        `  <strong>No. ${docNumber}</strong> <strong>Tanggal ${docDate}</strong>`
      );
    }
    
    // Document 2 section
    if (doc2Type && doc2Number && doc2Date) {
      const doc2DateFormatted = formatDateIndonesian(doc2Date);
      templateParts.push(
        `• <strong>${doc2Type}</strong>`,
        `  <strong>No. ${doc2Number}</strong> <strong>Tanggal ${doc2DateFormatted}</strong>`
      );
    } else if (doc2Type || doc2Number || doc2Date) {
      const docType = doc2Type || 'Dokumen Perizinan Tambahan';
      const docNumber = doc2Number || '[nomor]';
      const docDate = doc2Date ? formatDateIndonesian(doc2Date) : '[tanggal]';
      templateParts.push(
        `• <strong>${docType}</strong>`,
        `  <strong>No. ${docNumber}</strong> <strong>Tanggal ${docDate}</strong>`
      );
    }
    
    // Security approval section - use real Jakarta date
    const jakartaNow = (() => {
      try {
        const date = new Date();
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour12: false
        }).formatToParts(date);
        const map: Record<string, string> = {};
        for (const p of parts) {
          if (p.type && p.value) map[p.type] = p.value;
        }
        const y = map.year || String(date.getFullYear());
        const m = map.month || String(date.getMonth() + 1).padStart(2, '0');
        const d = map.day || String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      } catch {
        return new Date().toISOString().split('T')[0] || '';
      }
    })();
    const today = formatDateIndonesian(jakartaNow);
    templateParts.push(
      '',
      `Diterima ${signerPosition}`,
      `<strong>${today}</strong>`
    );
    
    return templateParts.join('\n');
  }, [dates, isValid, 
      supportingDoc1Type, supportingDoc1Number, supportingDoc1Date,
      supportingDoc2Type, supportingDoc2Number, supportingDoc2Date,
      simjaNumber, simjaDate, sikaNumber, sikaDate, 
      signerPosition, formatDateIndonesian]);

  // Template object
  const template = useMemo((): ImplementationTemplate => ({
    pelaksanaan: pelaksanaanTemplate,
    lainLain: lainLainTemplate
  }), [pelaksanaanTemplate, lainLainTemplate]);

  // Update handlers
  const updateStartDate = useCallback((date: string) => {
    setDates(prev => ({ ...prev, startDate: date }));
  }, []);

  const updateEndDate = useCallback((date: string) => {
    setDates(prev => ({ ...prev, endDate: date }));
  }, []);

  const updateDates = useCallback((newDates: ImplementationDates) => {
    setDates(newDates);
  }, []);

  const reset = useCallback(() => {
    setDates({ startDate: '', endDate: '' });
  }, []);

  const getData = useCallback(() => ({
    startDate: dates.startDate,
    endDate: dates.endDate,
    pelaksanaan: template.pelaksanaan
  }), [dates, template.pelaksanaan]);

  return {
    dates,
    template,
    errors,
    isValid,
    duration,
    updateStartDate,
    updateEndDate,
    updateDates,
    getData,
    reset
  };
}