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

/**
 * Get document type icon color class
 */
export function getDocumentTypeIconColor(type: SupportDocumentType): string {
  switch (type) {
    case 'SIMJA':
      return 'text-blue-500';
    case 'SIKA':
      return 'text-green-500';
    case 'WORK_ORDER':
      return 'text-orange-500';
    case 'KONTRAK_KERJA':
      return 'text-indigo-500';
    case 'JSA':
      return 'text-purple-500';
    default:
      return 'text-gray-500';
  }
}

/**
 * Get document type background color class
 */
export function getDocumentTypeBackgroundColor(type: SupportDocumentType): string {
  switch (type) {
    case 'SIMJA':
      return 'bg-blue-50';
    case 'SIKA':
      return 'bg-green-50';
    case 'WORK_ORDER':
      return 'bg-orange-50';
    case 'KONTRAK_KERJA':
      return 'bg-indigo-50';
    case 'JSA':
      return 'bg-purple-50';
    default:
      return 'bg-gray-50';
  }
}
