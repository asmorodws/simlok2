/**
 * Shared utilities for Submission Forms (Create & Edit)
 * Consolidates common logic to reduce duplication
 */

// ===============================
// Types
// ===============================
export interface Worker {
  id: string;
  worker_name: string;
  worker_photo: string;
  hsse_pass_number?: string;
  hsse_pass_valid_thru?: string;
  hsse_pass_document_upload?: string;
}

export interface SupportDoc {
  id: string;
  document_subtype?: string;
  document_number: string;
  document_date: string;
  document_upload: string;
}

// ===============================
// Constants
// ===============================
export const OPTIONAL_DOC_TYPES = {
  WORK_ORDER: 'work_order',
  KONTRAK_KERJA: 'kontrak_kerja',
  JSA: 'jsa',
  OTHER: 'other'
} as const;

export const OPTIONAL_DOC_LABELS: Record<string, string> = {
  work_order: 'Work Order',
  kontrak_kerja: 'Kontrak Kerja',
  jsa: 'JSA (Job Safety Analysis)',
  other: 'Dokumen Lainnya'
};

// ===============================
// Worker Utilities
// ===============================
export function createEmptyWorker(id?: string): Worker {
  return {
    id: id || `${Date.now()}_${Math.random()}`,
    worker_name: '',
    worker_photo: '',
    hsse_pass_number: '',
    hsse_pass_valid_thru: '',
    hsse_pass_document_upload: ''
  };
}

export function createEmptyDocument(type: string): SupportDoc {
  return {
    id: `${Date.now()}_${type}_${Math.random()}`,
    document_subtype: '',
    document_number: '',
    document_date: '',
    document_upload: '',
  };
}

/**
 * Parse bulk worker names (one per line)
 */
export function parseBulkWorkerNames(bulkText: string): string[] {
  return bulkText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Convert bulk names to Worker objects
 */
export function bulkNamesToWorkers(bulkText: string): Worker[] {
  const names = parseBulkWorkerNames(bulkText);
  return names.map(name => ({
    ...createEmptyWorker(),
    worker_name: name
  }));
}

/**
 * Adjust workers array to match desired count
 */
export function adjustWorkersToCount(
  currentWorkers: Worker[],
  targetCount: number
): Worker[] {
  const workers = [...currentWorkers];
  
  if (workers.length < targetCount) {
    // Add more workers
    const toAdd = targetCount - workers.length;
    for (let i = 0; i < toAdd; i++) {
      workers.push(createEmptyWorker());
    }
  } else if (workers.length > targetCount) {
    // Remove extra workers (from the end)
    workers.splice(targetCount);
  }
  
  return workers;
}

/**
 * Validate worker data
 */
export function validateWorker(worker: Worker): { valid: boolean; error?: string } {
  if (!worker.worker_name?.trim()) {
    return { valid: false, error: 'Nama pekerja wajib diisi' };
  }
  
  if (!worker.worker_photo?.trim()) {
    return { valid: false, error: 'Foto pekerja wajib diunggah' };
  }
  
  return { valid: true };
}

/**
 * Validate all workers
 */
export function validateWorkers(workers: Worker[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  workers.forEach((worker, index) => {
    const result = validateWorker(worker);
    if (!result.valid) {
      errors.push(`Pekerja ${index + 1}: ${result.error}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate support document
 */
export function validateSupportDocument(
  doc: SupportDoc,
  documentType: string
): { valid: boolean; error?: string } {
  if (!doc.document_number?.trim()) {
    return { valid: false, error: `Nomor dokumen ${documentType} wajib diisi` };
  }
  
  if (!doc.document_date?.trim()) {
    return { valid: false, error: `Tanggal dokumen ${documentType} wajib diisi` };
  }
  
  if (!doc.document_upload?.trim()) {
    return { valid: false, error: `File dokumen ${documentType} wajib diunggah` };
  }
  
  return { valid: true };
}

/**
 * Count filled workers
 */
export function countFilledWorkers(workers: Worker[]): number {
  return workers.filter(w => w.worker_name?.trim()).length;
}

/**
 * Check if any worker has data
 */
export function hasAnyWorkerData(workers: Worker[]): boolean {
  return workers.some(w => 
    w.worker_name?.trim() || 
    w.worker_photo?.trim() ||
    w.hsse_pass_number?.trim()
  );
}

// ===============================
// Document Utilities
// ===============================
export function isDocumentFilled(doc: SupportDoc): boolean {
  return Boolean(
    doc.document_number?.trim() ||
    doc.document_date?.trim() ||
    doc.document_upload?.trim()
  );
}

export function hasAnyDocumentData(docs: SupportDoc[]): boolean {
  return docs.some(isDocumentFilled);
}

export function filterFilledDocuments(docs: SupportDoc[]): SupportDoc[] {
  return docs.filter(isDocumentFilled);
}

/**
 * Group support documents by type for API submission
 */
export function groupDocumentsByType(documents: {
  simja: SupportDoc[];
  sika: SupportDoc[];
  workOrder: SupportDoc[];
  kontrakKerja: SupportDoc[];
  jsa: SupportDoc[];
}): Array<{
  document_type: string;
  document_subtype?: string;
  document_number: string;
  document_date: string;
  document_upload: string;
}> {
  const result: Array<any> = [];

  // SIMJA
  filterFilledDocuments(documents.simja).forEach(doc => {
    result.push({
      document_type: 'SIMJA',
      document_subtype: doc.document_subtype || '',
      document_number: doc.document_number,
      document_date: doc.document_date,
      document_upload: doc.document_upload,
    });
  });

  // SIKA
  filterFilledDocuments(documents.sika).forEach(doc => {
    result.push({
      document_type: 'SIKA',
      document_subtype: doc.document_subtype || '',
      document_number: doc.document_number,
      document_date: doc.document_date,
      document_upload: doc.document_upload,
    });
  });

  // Work Order
  filterFilledDocuments(documents.workOrder).forEach(doc => {
    result.push({
      document_type: 'WORK_ORDER',
      document_subtype: doc.document_subtype || '',
      document_number: doc.document_number,
      document_date: doc.document_date,
      document_upload: doc.document_upload,
    });
  });

  // Kontrak Kerja
  filterFilledDocuments(documents.kontrakKerja).forEach(doc => {
    result.push({
      document_type: 'KONTRAK_KERJA',
      document_subtype: doc.document_subtype || '',
      document_number: doc.document_number,
      document_date: doc.document_date,
      document_upload: doc.document_upload,
    });
  });

  // JSA
  filterFilledDocuments(documents.jsa).forEach(doc => {
    result.push({
      document_type: 'JSA',
      document_subtype: doc.document_subtype || '',
      document_number: doc.document_number,
      document_date: doc.document_date,
      document_upload: doc.document_upload,
    });
  });

  return result;
}
