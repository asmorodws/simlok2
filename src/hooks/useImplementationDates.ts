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
  simjaNumber?: string | undefined;
  simjaDate?: string | undefined;
  sikaNumber?: string | undefined;
  sikaDate?: string | undefined;
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
  simjaNumber = '',
  simjaDate = '',
  sikaNumber = '',
  sikaDate = '',
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

  // Generate lain-lain template
  const lainLainTemplate = useMemo((): string => {
    if (!dates.startDate || !dates.endDate || !isValid) {
      return '';
    }

    const templateParts: string[] = [];
    
    // Header
    templateParts.push('Izin diberikan berdasarkan :');
    
    // SIMJA section
    if (simjaNumber && simjaDate) {
      const simjaDateFormatted = formatDateIndonesian(simjaDate);
      templateParts.push(
        '• <strong>SIMJA</strong> Ast. Man. Facility Management',
        `  <strong>No. ${simjaNumber}</strong> <strong>Tanggal ${simjaDateFormatted}</strong>`
      );
    } else {
      templateParts.push(
        '• <strong>SIMJA</strong> Ast. Man. Facility Management',
        '  <strong>No. [nomor]</strong> <strong>Tanggal [tanggal]</strong>'
      );
    }
    
    // SIKA section
    if (sikaNumber && sikaDate) {
      const sikaDateFormatted = formatDateIndonesian(sikaDate);
      templateParts.push(
        '• <strong>SIKA</strong> Pekerjaan Dingin',
        `  <strong>No.${sikaNumber}</strong> <strong>Tgl. ${sikaDateFormatted}</strong>`
      );
    } else {
      templateParts.push(
        '• <strong>SIKA</strong> Pekerjaan Dingin',
        '  <strong>No.[nomor]</strong> <strong>Tgl. [tanggal]</strong>'
      );
    }
    
    // Security approval section
    const todayStr = new Date().toISOString().split('T')[0] || '';
    const today = formatDateIndonesian(todayStr);
    templateParts.push(
      '',
      `Diterima ${signerPosition}`,
      `<strong>${today}</strong>`
    );
    
    return templateParts.join('\n');
  }, [dates, isValid, simjaNumber, simjaDate, sikaNumber, sikaDate, signerPosition, formatDateIndonesian]);

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