/**
 * Utility functions untuk format dan validasi nomor telepon Indonesia
 */

/**
 * Format nomor telepon dengan prefix 62
 * @param phoneNumber - Nomor telepon input
 * @returns Nomor telepon dengan format 62 (tanpa +)
 */
export function formatPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Hapus semua karakter non-digit
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Jika dimulai dengan 0, hapus 0 di depan
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Jika dimulai dengan 62, hapus 62
  if (cleaned.startsWith('62')) {
    cleaned = cleaned.substring(2);
  }
  
  // Jika kosong setelah cleaning, return empty
  if (!cleaned) return '';
  
  // Return dengan format 62 (tanpa +)
  return `62${cleaned}`;
}

/**
 * Format nomor telepon untuk display (dengan spasi)
 * @param phoneNumber - Nomor telepon dengan format 62
 * @returns Nomor telepon dengan format display yang mudah dibaca
 * Contoh: 62 812-3456-7890
 */
export function formatPhoneNumberDisplay(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('62')) {
    const number = cleaned.substring(2);
    // Format: 62 8XX-XXXX-XXXX
    if (number.length >= 10) {
      return `62 ${number.substring(0, 3)}-${number.substring(3, 7)}-${number.substring(7)}`;
    }
    return `62 ${number}`;
  }
  
  return phoneNumber;
}

/**
 * Parse nomor telepon untuk input field (tanpa +62)
 * @param phoneNumber - Nomor telepon dengan format +62
 * @returns Nomor telepon tanpa prefix untuk ditampilkan di input
 */
export function parsePhoneNumberForInput(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  
  // Hapus semua karakter non-digit
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Jika dimulai dengan 62, hapus 62 dan tambahkan 0 di depan
  if (cleaned.startsWith('62')) {
    return '0' + cleaned.substring(2);
  }
  
  // Jika dimulai dengan 0, return as is
  if (cleaned.startsWith('0')) {
    return cleaned;
  }
  
  // Jika tidak ada prefix, tambahkan 0
  return cleaned ? '0' + cleaned : '';
}

/**
 * Validasi nomor telepon Indonesia
 * @param phoneNumber - Nomor telepon untuk divalidasi
 * @returns true jika valid, false jika tidak
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Cek jika dimulai dengan 62 (format internasional)
  if (cleaned.startsWith('62')) {
    const number = cleaned.substring(2);
    // Nomor setelah 62 harus dimulai dengan 8 dan minimal 9 digit
    return number.startsWith('8') && number.length >= 9 && number.length <= 13;
  }
  
  // Cek jika dimulai dengan 0 (format lokal)
  if (cleaned.startsWith('0')) {
    const number = cleaned.substring(1);
    // Nomor setelah 0 harus dimulai dengan 8 dan minimal 9 digit
    return number.startsWith('8') && number.length >= 9 && number.length <= 13;
  }
  
  return false;
}

/**
 * Normalize nomor telepon untuk disimpan di database
 * Selalu simpan dengan format 62XXXXXXXXXX (tanpa +)
 * @param phoneNumber - Nomor telepon input
 * @returns Nomor telepon dalam format 62 atau string kosong jika invalid
 */
export function normalizePhoneNumber(phoneNumber: string | null | undefined): string {
  if (!phoneNumber) return '';
  
  // Hapus semua karakter non-digit
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Jika dimulai dengan 0, hapus 0 di depan
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Jika dimulai dengan 62, hapus 62
  if (cleaned.startsWith('62')) {
    cleaned = cleaned.substring(2);
  }
  
  // Jika kosong setelah cleaning, return empty
  if (!cleaned) return '';
  
  // Return dengan format 62 (tanpa +)
  return `62${cleaned}`;
}
