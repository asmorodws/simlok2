/**
 * Document helpers for processing submission documents
 * Extracted from route handlers for reusability and testability
 */

/**
 * Normalize document number
 * - Convert to uppercase
 * - Remove "No." or "No" prefix at the beginning
 * 
 * @example
 * normalizeDocumentNumber("simja/0202") // "SIMJA/0202"
 * normalizeDocumentNumber("No. 096/SIMJA/S0700/2024-S0") // "096/SIMJA/S0700/2024-S0"
 * normalizeDocumentNumber("no simja/123") // "SIMJA/123"
 * normalizeDocumentNumber("NO. abc-123") // "ABC-123"
 */
export function normalizeDocumentNumber(docNumber: string | null | undefined): string | null {
  if (!docNumber || typeof docNumber !== 'string') {
    return null;
  }

  let normalized = docNumber.trim();
  
  // Remove "No." or "No" prefix (case insensitive)
  // Matches: "No. ", "No ", "no. ", "no ", "NO. ", "NO "
  normalized = normalized.replace(/^no\.?\s*/i, '');
  
  // Convert to uppercase
  normalized = normalized.toUpperCase();
  
  return normalized || null;
}

/**
 * Format date from YYYY-MM-DD to Indonesian readable format
 * 
 * @example
 * formatDateIndonesian("2024-01-15") // "15 Januari 2024"
 */
export function formatDateIndonesian(date: string): string {
  if (!date || !date.includes('-')) {
    return date;
  }

  try {
    const dateParts = date.split('-');
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];
    
    if (year && month && day) {
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthIndex = parseInt(month, 10) - 1;
      const monthName = monthNames[monthIndex] || month;
      return `${parseInt(day, 10)} ${monthName} ${year}`;
    }
  } catch (e) {
    console.error('Date parsing error:', e);
  }

  return date;
}

/**
 * Generate "Berdasarkan" text from SIMJA documents
 * Used in submission PDF generation
 * 
 * @param simjaDocuments - Array of SIMJA document objects
 * @returns Formatted text for "Berdasarkan" section
 * 
 * @example
 * generateBasedOnText([
 *   { document_number: "096/SIMJA", document_date: "2024-01-15" }
 * ])
 * // Returns: "Simja No. 096/SIMJA Tgl. 15 Januari 2024"
 */
export function generateBasedOnText(simjaDocuments: any[]): string {
  if (!simjaDocuments || simjaDocuments.length === 0) {
    return 'Surat Permohonan Izin Kerja'; // Default text
  }

  const validSimjaDocs = simjaDocuments.filter(
    doc => {
      const hasNumber = doc.document_number && doc.document_number.trim() !== '';
      const hasDate = doc.document_date && doc.document_date.trim() !== '';
      return hasNumber && hasDate;
    }
  );

  if (validSimjaDocs.length === 0) {
    return 'Surat Permohonan Izin Kerja'; // Default text
  }

  const simjaStrings = validSimjaDocs.map((doc) => {
    const number = doc.document_number || '';
    const date = doc.document_date || '';
    const formattedDate = formatDateIndonesian(date);
    return `Simja No. ${number} Tgl. ${formattedDate}`;
  });

  // Gabungkan dengan koma jika lebih dari 1
  return simjaStrings.join(', ');
}

/**
 * Validate document number format
 * @param docNumber - Document number to validate
 * @returns true if valid, false otherwise
 */
export function isValidDocumentNumber(docNumber: string | null | undefined): boolean {
  if (!docNumber || typeof docNumber !== 'string') {
    return false;
  }

  const normalized = normalizeDocumentNumber(docNumber);
  return normalized !== null && normalized.length > 0;
}

/**
 * Extract document prefix (e.g., "SIMJA" from "SIMJA/0202")
 */
export function extractDocumentPrefix(docNumber: string): string | null {
  const normalized = normalizeDocumentNumber(docNumber);
  if (!normalized) return null;

  const parts = normalized.split('/');
  return parts[0] || null;
}
