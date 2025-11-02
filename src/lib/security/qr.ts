import crypto from 'crypto';

// Salt untuk hashing - harus disimpan secure
const QR_SALT = process.env.QR_SECURITY_SALT || 'default-salt-change-in-production';

export interface QrPayload {
  id: string;
  start_date: string | null;
  end_date: string | null;
  timestamp: number;
}

export interface SimpleQrData {
  i: string;           // submission ID (shortened key)
  e: number;          // Expiration timestamp (shortened key)
  s: string;          // Short signature for verification (shortened key)
}

/**
 * Generate simple QR code data with minimal information
 */
export function generateSimpleQrData(submission: {
  id: string;
  implementation_start_date?: string | Date | null;
  implementation_end_date?: string | Date | null;
}): SimpleQrData {
  // Use only submission ID and expiration
  const expiration = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
  
  // Create a signature using only essential data
  const signatureData = `${submission.id}|${expiration}|${QR_SALT}`;
  const fullHash = crypto.createHash('sha256').update(signatureData).digest('hex');
  
  // Use first 32 characters of hash for improved security
  const signature = fullHash.substring(0, 32);

  return {
    i: submission.id,    // shortened key names for smaller JSON
    e: expiration,
    s: signature
  };
}

/**
 * Verify simple QR data
 */
export function verifySimpleQrData(qrData: SimpleQrData): boolean {
  try {
    // Check expiration
    if (Date.now() > qrData.e) {
      console.error('QR code has expired');
      return false;
    }

    // Verify signature
    const signatureData = `${qrData.i}|${qrData.e}|${QR_SALT}`;
    const expectedHash = crypto.createHash('sha256').update(signatureData).digest('hex');
    const expectedSignature = expectedHash.substring(0, 32);

    if (expectedSignature !== qrData.s) {
      console.error('QR signature verification failed');
      return false;
    }

    return true;
  } catch (error) {
    console.error('QR verification failed:', error);
    return false;
  }
}

/**
 * Generate QR code string that can be encoded to QR image (ULTRA SIMPLIFIED)
 */
export function generateQrString(submission: {
  id: string;
  implementation_start_date?: string | Date | null;
  implementation_end_date?: string | Date | null;
}): string {
  const qrData = generateSimpleQrData(submission);
  
  // Create extremely compact QR string - no JSON, direct concatenation
  // Format: SL:submissionId:expiration:signature
  return `SL:${qrData.i}:${qrData.e}:${qrData.s}`;
}

/**
 * Parse QR string and verify it (ULTRA SIMPLIFIED)
 */
export function parseQrString(qrString: string): QrPayload | null {
  try {
    // Check if it's just a submission ID (legacy format or manual QR)
    if (!qrString.includes(':') && !qrString.includes('|')) {
      // This might be a raw submission ID - attempt to handle gracefully
      if (qrString.length > 20 && qrString.match(/^[a-zA-Z0-9]+$/)) {
        console.warn('QR code appears to be a raw submission ID (unsecure format):', qrString);
        // Return a basic payload with just the ID for backward compatibility
        return {
          id: qrString,
          start_date: null,
          end_date: null,
          timestamp: Date.now() // Current time as timestamp
        };
      }
    }
    
    // Handle old base64 format for backward compatibility
    if (qrString.includes('|')) {
      const parts = qrString.split('|');
      
      if (parts.length !== 2 || parts[0] !== 'SL') {
        console.error('Invalid QR format. Expected "SL|base64data", got:', qrString);
        throw new Error('Invalid QR format - please scan a valid SIMLOK QR code');
      }

      const base64Part = parts[1];
      if (!base64Part) {
        throw new Error('Missing QR data');
      }

      // Decode base64 data
      const dataString = Buffer.from(base64Part, 'base64').toString('utf8');
      const qrData: any = JSON.parse(dataString);
      
      // Handle old format with full keys
      const normalizedData: SimpleQrData = {
        i: qrData.id || qrData.i,
        e: qrData.exp || qrData.e, 
        s: qrData.sig || qrData.s
      };
      
      if (!normalizedData.i || !normalizedData.e || !normalizedData.s) {
        throw new Error('Invalid QR data structure');
      }

      // Verify the QR data
      if (!verifySimpleQrData(normalizedData)) {
        throw new Error('QR verification failed');
      }

      // Convert to QrPayload format for compatibility
      const payload: QrPayload = {
        id: normalizedData.i,
        start_date: null,
        end_date: null,
        timestamp: normalizedData.e - (24 * 60 * 60 * 1000)
      };

      return payload;
    }
    
    // Handle new colon-separated format: SL:submissionId:expiration:signature
    const parts = qrString.split(':');
    
    if (parts.length !== 4 || parts[0] !== 'SL') {
      console.error('Invalid QR format. Expected "SL:id:exp:sig", got:', qrString);
      throw new Error('Invalid QR format - please scan a valid SIMLOK QR code');
    }

    const [, submissionId, expirationStr, signature] = parts;
    
    if (!submissionId || !expirationStr || !signature) {
      throw new Error('Missing QR data components');
    }

    const expiration = parseInt(expirationStr, 10);
    if (isNaN(expiration)) {
      throw new Error('Invalid expiration timestamp');
    }

    const qrData: SimpleQrData = {
      i: submissionId,
      e: expiration,
      s: signature
    };

    // Verify the QR data
    if (!verifySimpleQrData(qrData)) {
      throw new Error('QR verification failed');
    }

    // Convert to QrPayload format for compatibility
    const payload: QrPayload = {
      id: qrData.i,
      start_date: null, // We don't store dates in simple QR anymore
      end_date: null,
      timestamp: qrData.e - (24 * 60 * 60 * 1000) // Calculate original timestamp
    };

    return payload;
  } catch (error) {
    console.error('QR parsing failed:', error);
    return null;
  }
}

/**
 * Check if a QR payload is valid for the current date
 */
export function isQrValidForDate(payload: QrPayload, checkDate: Date = new Date()): boolean {
  const startDate = payload.start_date ? new Date(payload.start_date) : null;
  const endDate = payload.end_date ? new Date(payload.end_date) : null;

  // If no implementation dates are set, QR is considered valid
  if (!startDate && !endDate) {
    return true;
  }

  // Check if current date is within implementation period
  const now = checkDate.getTime();
  
  if (startDate && now < startDate.getTime()) {
    return false; // Too early
  }
  
  if (endDate && now > endDate.getTime()) {
    return false; // Too late
  }

  return true;
}
