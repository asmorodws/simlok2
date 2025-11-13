import crypto from 'crypto';

// Salt untuk hashing - harus disimpan secure
const QR_SALT = process.env.QR_SECURITY_SALT || 'default-salt-change-in-production';

export interface QrPayload {
  id: string;
  start_date: string | null;
  end_date: string | null;
  timestamp: number; // QR generation timestamp for tracking purposes only
}

export interface SimpleQrData {
  i: string;           // submission ID (shortened key)
  sd: string | null;   // Start date YYYY-MM-DD (shortened key)
  ed: string | null;   // End date YYYY-MM-DD (shortened key)
  s: string;           // Short signature for verification (shortened key)
}

/**
 * Generate simple QR code data with implementation dates for validation
 * QR code is valid only during the implementation period (start_date to end_date)
 */
export function generateSimpleQrData(submission: {
  id: string;
  implementation_start_date?: string | Date | null;
  implementation_end_date?: string | Date | null;
}): SimpleQrData {
  // Format dates to YYYY-MM-DD (timezone-safe)
  const formatDate = (date: string | Date | null | undefined): string | null => {
    if (!date) return null;
    
    try {
      let d: Date;
      
      if (typeof date === 'string') {
        // Handle different string formats
        if (date.includes('T')) {
          // ISO string: extract date part only to avoid timezone issues
          d = new Date(date);
        } else {
          // Simple date string: append T00:00:00 to ensure local timezone
          d = new Date(date + 'T00:00:00');
        }
      } else {
        d = date;
      }
      
      // Validate date
      if (isNaN(d.getTime())) {
        console.error('Invalid date format:', date);
        return null;
      }
      
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error formatting date:', date, error);
      return null;
    }
  };

  const startDate = formatDate(submission.implementation_start_date);
  const endDate = formatDate(submission.implementation_end_date);
  
  // Validate: end date should not be before start date
  if (startDate && endDate && endDate < startDate) {
    console.warn('Warning: Implementation end date is before start date!', {
      start: startDate,
      end: endDate,
      submission_id: submission.id
    });
    // Still generate QR code but log warning for debugging
  }
  
  // Create a signature using submission data
  const signatureData = `${submission.id}|${startDate}|${endDate}|${QR_SALT}`;
  const fullHash = crypto.createHash('sha256').update(signatureData).digest('hex');
  
  // Use first 32 characters of hash for improved security
  const signature = fullHash.substring(0, 32);

  return {
    i: submission.id,
    sd: startDate,
    ed: endDate,
    s: signature
  };
}

/**
 * Verify simple QR data
 * Validates signature and checks if current date is within implementation period
 */
export function verifySimpleQrData(qrData: SimpleQrData, scanDate: Date = new Date()): boolean {
  try {
    // Validate input
    if (!qrData || !qrData.i || !qrData.s) {
      console.error('Invalid QR data structure:', qrData);
      return false;
    }
    
    // Verify signature first
    const signatureData = `${qrData.i}|${qrData.sd}|${qrData.ed}|${QR_SALT}`;
    const expectedHash = crypto.createHash('sha256').update(signatureData).digest('hex');
    const expectedSignature = expectedHash.substring(0, 32);

    if (expectedSignature !== qrData.s) {
      console.error('QR signature verification failed');
      console.error('Expected:', expectedSignature);
      console.error('Got:', qrData.s);
      return false;
    }

    // Validate scan date
    if (isNaN(scanDate.getTime())) {
      console.error('Invalid scan date:', scanDate);
      return false;
    }

    // Check if scan date is within implementation period
    if (qrData.sd || qrData.ed) {
      const scanDateStr = `${scanDate.getFullYear()}-${String(scanDate.getMonth() + 1).padStart(2, '0')}-${String(scanDate.getDate()).padStart(2, '0')}`;
      
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (qrData.sd && !dateRegex.test(qrData.sd)) {
        console.error('Invalid start date format:', qrData.sd);
        return false;
      }
      if (qrData.ed && !dateRegex.test(qrData.ed)) {
        console.error('Invalid end date format:', qrData.ed);
        return false;
      }
      
      // Check if before start date
      if (qrData.sd && scanDateStr < qrData.sd) {
        console.error('QR code scan attempted before implementation start date');
        console.error('Scan date:', scanDateStr, 'Start date:', qrData.sd);
        return false;
      }
      
      // Check if after end date
      if (qrData.ed && scanDateStr > qrData.ed) {
        console.error('QR code has expired (past implementation end date)');
        console.error('Scan date:', scanDateStr, 'End date:', qrData.ed);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('QR verification failed:', error);
    return false;
  }
}

/**
 * Generate QR code string that can be encoded to QR image
 * Format: SL:submissionId:startDate:endDate:signature
 * Dates are in YYYY-MM-DD format or 'null' if not set
 */
export function generateQrString(submission: {
  id: string;
  implementation_start_date?: string | Date | null;
  implementation_end_date?: string | Date | null;
}): string {
  const qrData = generateSimpleQrData(submission);
  
  // Create compact QR string with dates
  // Format: SL:submissionId:startDate:endDate:signature
  // Use 'null' string for empty dates to maintain format consistency
  return `SL:${qrData.i}:${qrData.sd || 'null'}:${qrData.ed || 'null'}:${qrData.s}`;
}

/**
 * Parse QR string and verify it
 * Supports multiple formats for backward compatibility:
 * - New: SL:submissionId:startDate:endDate:signature
 * - Legacy: SL|base64data or SL:submissionId:expiration:signature
 */
export function parseQrString(qrString: string): QrPayload | null {
  try {
    // Validate input
    if (!qrString || typeof qrString !== 'string' || qrString.trim() === '') {
      console.error('Invalid QR string: empty or not a string');
      return null;
    }

    const trimmedQrString = qrString.trim();
    
    // Check if it's just a submission ID (legacy format or manual QR)
    if (!trimmedQrString.includes(':') && !trimmedQrString.includes('|')) {
      // This might be a raw submission ID - attempt to handle gracefully
      if (trimmedQrString.length > 20 && trimmedQrString.match(/^[a-zA-Z0-9]+$/)) {
        console.warn('QR code appears to be a raw submission ID (unsecure format):', trimmedQrString);
        // Return a basic payload with just the ID for backward compatibility
        return {
          id: trimmedQrString,
          start_date: null,
          end_date: null,
          timestamp: Date.now() // Current time as timestamp
        };
      }
    }
    
    // Handle old base64 format for backward compatibility
    if (trimmedQrString.includes('|')) {
      const parts = trimmedQrString.split('|');
      
      if (parts.length !== 2 || parts[0] !== 'SL') {
        console.error('Invalid QR format. Expected "SL|base64data", got:', trimmedQrString);
        throw new Error('Invalid QR format - please scan a valid SIMLOK QR code');
      }

      const base64Part = parts[1];
      if (!base64Part) {
        throw new Error('Missing QR data');
      }

      // Decode base64 data
      const dataString = Buffer.from(base64Part, 'base64').toString('utf8');
      const qrData: any = JSON.parse(dataString);
      
      // Handle old format - try to extract dates if available
      const payload: QrPayload = {
        id: qrData.id || qrData.i,
        start_date: qrData.start_date || qrData.sd || null,
        end_date: qrData.end_date || qrData.ed || null,
        timestamp: Date.now()
      };

      return payload;
    }
    
    // Handle colon-separated format
    const parts = trimmedQrString.split(':');
    
    // New format: SL:id:startDate:endDate:signature (5 parts)
    if (parts.length === 5 && parts[0] === 'SL') {
      const [, submissionId, startDate, endDate, signature] = parts;
      
      if (!submissionId || !signature) {
        throw new Error('Missing QR data components');
      }
      
      // Validate submission ID format
      if (!submissionId.match(/^[a-zA-Z0-9_-]+$/)) {
        console.error('Invalid submission ID format:', submissionId);
        throw new Error('Invalid submission ID');
      }

      const qrData: SimpleQrData = {
        i: submissionId,
        sd: !startDate || startDate === 'null' ? null : startDate,
        ed: !endDate || endDate === 'null' ? null : endDate,
        s: signature
      };

      // Verify the QR data
      if (!verifySimpleQrData(qrData)) {
        throw new Error('QR verification failed');
      }

      // Convert to QrPayload format
      const payload: QrPayload = {
        id: qrData.i,
        start_date: qrData.sd,
        end_date: qrData.ed,
        timestamp: Date.now() // Current scan time
      };

      return payload;
    }
    
    // Old format: SL:id:expiration:signature (4 parts) - for backward compatibility
    if (parts.length === 4 && parts[0] === 'SL') {
      const [, submissionId, expirationStr, signature] = parts;
      
      if (!submissionId || !expirationStr || !signature) {
        throw new Error('Missing QR data components');
      }

      const expiration = parseInt(expirationStr, 10);
      if (isNaN(expiration)) {
        throw new Error('Invalid expiration timestamp');
      }

      // Check if expired based on old 24-hour logic
      if (Date.now() > expiration) {
        console.error('QR code has expired (old format)');
        throw new Error('QR code has expired - please generate a new one');
      }

      // For old format, we don't have dates, so return basic payload
      const payload: QrPayload = {
        id: submissionId,
        start_date: null,
        end_date: null,
        timestamp: expiration - (24 * 60 * 60 * 1000) // Calculate original timestamp
      };

      return payload;
    }
    
    console.error('Invalid QR format. Expected "SL:id:startDate:endDate:sig" or legacy format, got:', trimmedQrString);
    throw new Error('Invalid QR format - please scan a valid SIMLOK QR code');

  } catch (error) {
    console.error('QR parsing failed:', error);
    return null;
  }
}

/**
 * Check if a QR payload is valid for the given date
 * This checks if the scan date is within the implementation period
 * 
 * @param payload - QR payload with implementation dates
 * @param checkDate - Date to check against (defaults to current date)
 * @returns true if QR is valid for the given date, false otherwise
 */
export function isQrValidForDate(payload: QrPayload, checkDate: Date = new Date()): boolean {
  // If no implementation dates are set, QR is considered valid
  if (!payload.start_date && !payload.end_date) {
    console.warn('QR code has no implementation dates - allowing scan');
    return true;
  }

  // Format check date to YYYY-MM-DD for comparison
  const checkDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;

  // Check if before start date
  if (payload.start_date && checkDateStr < payload.start_date) {
    console.error(`Scan date ${checkDateStr} is before implementation start date ${payload.start_date}`);
    return false;
  }
  
  // Check if after end date
  if (payload.end_date && checkDateStr > payload.end_date) {
    console.error(`Scan date ${checkDateStr} is after implementation end date ${payload.end_date}`);
    return false;
  }

  return true;
}
