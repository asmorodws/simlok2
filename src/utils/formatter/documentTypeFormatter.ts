/**
 * Utility untuk format label tipe dokumen pendukung
 * Memastikan label ditampilkan tanpa underscore di UI
 */

export type SupportDocumentType = 'SIMJA' | 'SIKA' | 'WORK_ORDER' | 'KONTRAK_KERJA' | 'JSA';

/**
 * Format document type untuk ditampilkan di UI
 * @param type - Document type enum
 * @returns Formatted label tanpa underscore
 */
export function formatDocumentTypeLabel(type: SupportDocumentType): string {
  switch (type) {
    case 'SIMJA':
      return 'SIMJA';
    case 'SIKA':
      return 'SIKA';
    case 'WORK_ORDER':
      return 'Work Order';
    case 'KONTRAK_KERJA':
      return 'Kontrak Kerja';
    case 'JSA':
      return 'JSA';
    default:
      return type;
  }
}

/**
 * Format document type untuk field label
 * @param type - Document type enum
 * @param fieldType - Tipe field (number, date, upload)
 * @returns Formatted field label
 */
export function formatDocumentFieldLabel(
  type: SupportDocumentType,
  fieldType: 'number' | 'date' | 'upload'
): string {
  const typeLabel = formatDocumentTypeLabel(type);
  
  switch (fieldType) {
    case 'number':
      return `Nomor ${typeLabel}`;
    case 'date':
      if (type === 'JSA') {
        return 'Tanggal Dokumen JSA';
      }
      return `Tanggal ${typeLabel}`;
    case 'upload':
      return `Upload Dokumen ${typeLabel} (PDF)`;
    default:
      return typeLabel;
  }
}
