/**
 * Enhanced Input Validation Utilities
 * Validasi yang lebih ketat untuk berbagai tipe input
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

export class InputValidator {
  /**
   * Validate name fields (only letters, spaces, and common name characters)
   */
  static validateName(value: string, fieldName: string = 'Nama'): ValidationResult {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: `${fieldName} wajib diisi` };
    }

    const trimmedValue = value.trim();

    // Check minimum length
    if (trimmedValue.length < 2) {
      return { isValid: false, error: `${fieldName} minimal 2 karakter` };
    }

    // Check maximum length
    if (trimmedValue.length > 100) {
      return { isValid: false, error: `${fieldName} maksimal 100 karakter` };
    }

    // Only allow letters, spaces, apostrophes, hyphens, and dots
    const nameRegex = /^[a-zA-Z\s.''-]+$/;
    if (!nameRegex.test(trimmedValue)) {
      return { 
        isValid: false, 
        error: `${fieldName} hanya boleh berisi huruf, spasi, tanda petik, tanda hubung, dan titik` 
      };
    }

    // Check for multiple consecutive spaces
    if (/\s{2,}/.test(trimmedValue)) {
      return { 
        isValid: false, 
        error: `${fieldName} tidak boleh memiliki lebih dari satu spasi berturut-turut` 
      };
    }

    // Sanitize: capitalize first letter of each word
    const sanitizedValue = trimmedValue
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return { isValid: true, sanitizedValue };
  }

  /**
   * Validate phone number (Indonesian format)
   */
  static validatePhoneNumber(value: string): ValidationResult {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'Nomor telepon wajib diisi' };
    }

    const trimmedValue = value.trim();

    // Remove all non-numeric characters for validation
    const numbersOnly = trimmedValue.replace(/[^0-9]/g, '');

    // Check if it's all numbers (after cleaning)
    if (!/^[0-9+\-\s()]*$/.test(trimmedValue)) {
      return { 
        isValid: false, 
        error: 'Nomor telepon hanya boleh berisi angka, +, -, (, ), dan spasi' 
      };
    }

    // Check length (Indonesian phone numbers)
    if (numbersOnly.length < 10 || numbersOnly.length > 15) {
      return { 
        isValid: false, 
        error: 'Nomor telepon harus 10-15 digit' 
      };
    }

    // Validate Indonesian phone number patterns
    if (numbersOnly.startsWith('08')) {
      // Mobile number format: 08xx-xxxx-xxxx
      if (numbersOnly.length < 11 || numbersOnly.length > 13) {
        return { 
          isValid: false, 
          error: 'Nomor HP Indonesia harus 11-13 digit (dimulai dengan 08)' 
        };
      }
    } else if (numbersOnly.startsWith('62')) {
      // International format: +62xxx
      if (numbersOnly.length < 12 || numbersOnly.length > 15) {
        return { 
          isValid: false, 
          error: 'Nomor internasional (+62) harus 12-15 digit' 
        };
      }
    } else if (!numbersOnly.startsWith('0')) {
      return { 
        isValid: false, 
        error: 'Nomor telepon harus dimulai dengan 08 (HP) atau 02/03/04/05/06/07 (telepon rumah)' 
      };
    }

    // Sanitize: format phone number
    let sanitizedValue: string;
    if (numbersOnly.startsWith('08')) {
      // Format: 0812-3456-7890
      sanitizedValue = numbersOnly.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
    } else if (numbersOnly.startsWith('62')) {
      // Format: +62-812-3456-7890
      sanitizedValue = `+${numbersOnly.replace(/(\d{2})(\d{3})(\d{4})(\d+)/, '$1-$2-$3-$4')}`;
    } else {
      sanitizedValue = trimmedValue;
    }

    return { isValid: true, sanitizedValue };
  }

  /**
   * Validate address (letters, numbers, spaces, and common address characters)
   */
  static validateAddress(value: string): ValidationResult {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'Alamat wajib diisi' };
    }

    const trimmedValue = value.trim();

    // Check minimum length
    if (trimmedValue.length < 10) {
      return { isValid: false, error: 'Alamat minimal 10 karakter' };
    }

    // Check maximum length
    if (trimmedValue.length > 500) {
      return { isValid: false, error: 'Alamat maksimal 500 karakter' };
    }

    // Allow letters, numbers, spaces, and common address characters
    const addressRegex = /^[a-zA-Z0-9\s.,\-\/'#()]+$/;
    if (!addressRegex.test(trimmedValue)) {
      return { 
        isValid: false, 
        error: 'Alamat hanya boleh berisi huruf, angka, spasi, dan karakter .,\-\/\'#()' 
      };
    }

    // Check for multiple consecutive spaces
    if (/\s{3,}/.test(trimmedValue)) {
      return { 
        isValid: false, 
        error: 'Alamat tidak boleh memiliki lebih dari dua spasi berturut-turut' 
      };
    }

    // Sanitize: proper case and clean up spaces
    const sanitizedValue = trimmedValue
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .split(' ')
      .map(word => {
        // Don't capitalize prepositions and articles
        const lowerCaseWords = ['di', 'ke', 'dari', 'jalan', 'jl', 'rt', 'rw', 'no', 'kel', 'kec'];
        if (lowerCaseWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    return { isValid: true, sanitizedValue };
  }

  /**
   * Validate email
   */
  static validateEmail(value: string): ValidationResult {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'Email wajib diisi' };
    }

    const trimmedValue = value.trim().toLowerCase();

    // Basic email regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedValue)) {
      return { isValid: false, error: 'Format email tidak valid' };
    }

    // Check length
    if (trimmedValue.length > 254) {
      return { isValid: false, error: 'Email terlalu panjang (maksimal 254 karakter)' };
    }

    // Check for common typos
    const emailParts = trimmedValue.split('@');
    if (emailParts.length === 2) {
      const domain = emailParts[1];
      if (domain && (domain.includes('gmial') || domain.includes('gmai'))) {
        return { isValid: false, error: 'Mungkin Anda maksud gmail.com?' };
      }
    }

    return { isValid: true, sanitizedValue: trimmedValue };
  }

  /**
   * Validate vendor/company name
   */
  static validateVendorName(value: string): ValidationResult {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'Nama vendor wajib diisi' };
    }

    const trimmedValue = value.trim();

    // Check minimum length
    if (trimmedValue.length < 2) {
      return { isValid: false, error: 'Nama vendor minimal 2 karakter' };
    }

    // Check maximum length
    if (trimmedValue.length > 150) {
      return { isValid: false, error: 'Nama vendor maksimal 150 karakter' };
    }

    // Allow letters, numbers, spaces, and common company characters
    const vendorRegex = /^[a-zA-Z0-9\s.,\-&()\/']+$/;
    if (!vendorRegex.test(trimmedValue)) {
      return { 
        isValid: false, 
        error: 'Nama vendor hanya boleh berisi huruf, angka, spasi, dan karakter .,\-&()\/' 
      };
    }

    // Sanitize: proper case
    const sanitizedValue = trimmedValue
      .split(' ')
      .map(word => {
        // Keep certain abbreviations uppercase
        const upperCaseWords = ['PT', 'CV', 'UD', 'PD', 'TBK', 'LLC', 'LTD', 'INC'];
        if (upperCaseWords.includes(word.toUpperCase())) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    return { isValid: true, sanitizedValue };
  }

  /**
   * Validate job description
   */
  static validateJobDescription(value: string): ValidationResult {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'Deskripsi pekerjaan wajib diisi' };
    }

    const trimmedValue = value.trim();

    // Check minimum length
    if (trimmedValue.length < 5) {
      return { isValid: false, error: 'Deskripsi pekerjaan minimal 5 karakter' };
    }

    // Check maximum length
    if (trimmedValue.length > 200) {
      return { isValid: false, error: 'Deskripsi pekerjaan maksimal 200 karakter' };
    }

    // Allow letters, numbers, spaces, and common description characters
    const jobRegex = /^[a-zA-Z0-9\s.,\-\/()&+]+$/;
    if (!jobRegex.test(trimmedValue)) {
      return { 
        isValid: false, 
        error: 'Deskripsi pekerjaan hanya boleh berisi huruf, angka, spasi, dan karakter .,\-\/()&+' 
      };
    }

    // Sanitize: sentence case
    const sanitizedValue = trimmedValue.charAt(0).toUpperCase() + trimmedValue.slice(1);

    return { isValid: true, sanitizedValue };
  }

  /**
   * Validate document number (SIKA, SIMJA, etc.)
   */
  static validateDocumentNumber(value: string, documentType: string = 'Dokumen'): ValidationResult {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: `Nomor ${documentType} wajib diisi` };
    }

    const trimmedValue = value.trim().toUpperCase();

    // Allow letters, numbers, slashes, hyphens, and dots
    const docNumberRegex = /^[A-Z0-9\/\-\.]+$/;
    if (!docNumberRegex.test(trimmedValue)) {
      return { 
        isValid: false, 
        error: `Nomor ${documentType} hanya boleh berisi huruf besar, angka, /, -, dan .` 
      };
    }

    // Check length
    if (trimmedValue.length < 3) {
      return { isValid: false, error: `Nomor ${documentType} minimal 3 karakter` };
    }

    if (trimmedValue.length > 50) {
      return { isValid: false, error: `Nomor ${documentType} maksimal 50 karakter` };
    }

    return { isValid: true, sanitizedValue: trimmedValue };
  }

  /**
   * Validate number inputs
   */
  static validateNumber(
    value: string | number, 
    min?: number, 
    max?: number, 
    fieldName: string = 'Angka'
  ): ValidationResult {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
      return { isValid: false, error: `${fieldName} harus berupa angka` };
    }

    if (min !== undefined && numValue < min) {
      return { isValid: false, error: `${fieldName} minimal ${min}` };
    }

    if (max !== undefined && numValue > max) {
      return { isValid: false, error: `${fieldName} maksimal ${max}` };
    }

    return { isValid: true, sanitizedValue: numValue.toString() };
  }
}