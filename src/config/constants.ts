/**
 * Application Constants
 * Centralized configuration values to avoid magic numbers
 * and make configuration changes easier to manage
 */

// ==================== PAGINATION ====================

export const PAGINATION = {
  /** Default page size for lists */
  DEFAULT_LIMIT: 20,
  /** Maximum page size allowed */
  MAX_LIMIT: 100,
  /** Minimum page size */
  MIN_LIMIT: 1,
  /** Default page number */
  DEFAULT_PAGE: 1,
} as const;

// ==================== FILE UPLOAD ====================

export const FILE_UPLOAD = {
  /** Maximum file size in bytes (8MB) */
  MAX_SIZE: 8 * 1024 * 1024,
  /** Maximum file size in MB for display */
  MAX_SIZE_MB: 8,
  /** Allowed MIME types */
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  /** Allowed file extensions */
  ALLOWED_EXTENSIONS: [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.pdf',
    '.doc',
    '.docx',
  ],
  /** Upload directory */
  UPLOAD_DIR: './public/uploads',
} as const;

// ==================== SESSION MANAGEMENT ====================

export const SESSION = {
  /** Session expires after 24 hours (in milliseconds) */
  MAX_AGE: 24 * 60 * 60 * 1000,
  /** Idle timeout - 2 hours (in milliseconds) */
  IDLE_TIMEOUT: 2 * 60 * 60 * 1000,
  /** Absolute timeout - 7 days (in milliseconds) */
  ABSOLUTE_TIMEOUT: 7 * 24 * 60 * 60 * 1000,
  /** Update activity every 5 minutes (in milliseconds) */
  ACTIVITY_UPDATE_INTERVAL: 5 * 60 * 1000,
  /** Maximum concurrent sessions per user */
  MAX_SESSIONS_PER_USER: 5,
  /** Session cleanup interval - 1 hour (in milliseconds) */
  CLEANUP_INTERVAL: 60 * 60 * 1000,
} as const;

// ==================== RATE LIMITING ====================

export const RATE_LIMIT = {
  /** Submission creation: 5 per 5 minutes */
  SUBMISSION: {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 5 * 60 * 1000,
  },
  /** Vendor registration: 5 per 5 minutes per IP */
  REGISTRATION: {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 5 * 60 * 1000,
  },
  /** Login attempts: 5 per 15 minutes */
  LOGIN: {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 15 * 60 * 1000,
  },
  /** API calls: 100 per minute */
  API: {
    MAX_ATTEMPTS: 100,
    WINDOW_MS: 60 * 1000,
  },
} as const;

// ==================== CACHING ====================

export const CACHE = {
  /** Visitor stats cache - 5 minutes */
  VISITOR_STATS_TTL: 5 * 60 * 1000,
  /** Visitor charts cache - 10 minutes */
  VISITOR_CHARTS_TTL: 10 * 60 * 1000,
  /** Dashboard stats cache - 2 minutes */
  DASHBOARD_STATS_TTL: 2 * 60 * 1000,
  /** User list cache - 1 minute */
  USER_LIST_TTL: 1 * 60 * 1000,
  /** Submission list cache - 1 minute */
  SUBMISSION_LIST_TTL: 1 * 60 * 1000,
  /** Cache cleanup interval - 5 minutes */
  CLEANUP_INTERVAL: 5 * 60 * 1000,
} as const;

// ==================== QR CODE ====================

export const QR_CODE = {
  /** QR code size in pixels */
  SIZE: 300,
  /** Error correction level */
  ERROR_CORRECTION: 'M' as const,
  /** Scan history default limit */
  SCAN_HISTORY_LIMIT: 50,
  /** Max scans per day per verifier per submission */
  MAX_SCANS_PER_DAY: 1,
} as const;

// ==================== SIMLOK NUMBER ====================

export const SIMLOK = {
  /** SIMLOK number prefix */
  PREFIX: 'S00330',
  /** SIMLOK number suffix */
  SUFFIX: 'S0',
  /** SIMLOK number format: {number}/S00330/{year}-S0 */
  FORMAT: '{number}/S00330/{year}-S0',
} as const;

// ==================== NOTIFICATION ====================

export const NOTIFICATION = {
  /** Default unread notification limit */
  UNREAD_LIMIT: 50,
  /** Notification retention days */
  RETENTION_DAYS: 90,
  /** Cleanup old notifications interval - 24 hours */
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,
} as const;

// ==================== DATABASE ====================

export const DATABASE = {
  /** Transaction timeout in milliseconds */
  TRANSACTION_TIMEOUT: 5000,
  /** Query timeout in milliseconds */
  QUERY_TIMEOUT: 30000,
  /** Connection pool size */
  POOL_SIZE: 10,
} as const;

// ==================== VALIDATION ====================

export const VALIDATION = {
  /** Password minimum length */
  PASSWORD_MIN_LENGTH: 6,
  /** Password maximum length */
  PASSWORD_MAX_LENGTH: 100,
  /** Email maximum length */
  EMAIL_MAX_LENGTH: 100,
  /** Name maximum length */
  NAME_MAX_LENGTH: 100,
  /** Phone number pattern */
  PHONE_PATTERN: /^(?:\+62|62|0)[0-9]{9,12}$/,
  /** Email pattern (basic) */
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// ==================== DATE & TIME ====================

export const DATE_TIME = {
  /** Application timezone */
  TIMEZONE: 'Asia/Jakarta',
  /** Date format for display (Indonesian) */
  DATE_FORMAT: 'dd MMMM yyyy',
  /** DateTime format for display (Indonesian) */
  DATETIME_FORMAT: 'dd MMMM yyyy HH:mm',
  /** ISO date format for inputs */
  ISO_DATE_FORMAT: 'yyyy-MM-dd',
} as const;

// ==================== RESPONSE CODES ====================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ==================== ERROR MESSAGES ====================

export const ERROR_MESSAGES = {
  // Authentication
  UNAUTHORIZED: 'Anda tidak memiliki akses. Silakan login terlebih dahulu.',
  FORBIDDEN: 'Anda tidak memiliki izin untuk mengakses resource ini.',
  INVALID_CREDENTIALS: 'Email atau password tidak valid.',
  SESSION_EXPIRED: 'Sesi Anda telah berakhir. Silakan login kembali.',
  
  // Validation
  INVALID_INPUT: 'Input tidak valid. Silakan periksa kembali data Anda.',
  REQUIRED_FIELD: 'Field ini wajib diisi.',
  INVALID_EMAIL: 'Format email tidak valid.',
  INVALID_PHONE: 'Format nomor telepon tidak valid.',
  PASSWORD_TOO_SHORT: `Password minimal ${VALIDATION.PASSWORD_MIN_LENGTH} karakter.`,
  
  // Database
  NOT_FOUND: 'Data tidak ditemukan.',
  DUPLICATE_ENTRY: 'Data sudah ada dalam sistem.',
  DATABASE_ERROR: 'Terjadi kesalahan database.',
  
  // File Upload
  FILE_TOO_LARGE: `Ukuran file maksimal ${FILE_UPLOAD.MAX_SIZE_MB}MB.`,
  INVALID_FILE_TYPE: 'Tipe file tidak didukung.',
  UPLOAD_FAILED: 'Upload file gagal. Silakan coba lagi.',
  
  // Rate Limiting
  TOO_MANY_REQUESTS: 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.',
  
  // QR Code
  INVALID_QR: 'QR code tidak valid.',
  DUPLICATE_SCAN: 'QR code sudah di-scan hari ini.',
  QR_EXPIRED: 'QR code sudah expired.',
  
  // General
  INTERNAL_ERROR: 'Terjadi kesalahan internal. Silakan hubungi administrator.',
  NETWORK_ERROR: 'Terjadi kesalahan jaringan. Silakan periksa koneksi Anda.',
} as const;

// ==================== SUCCESS MESSAGES ====================

export const SUCCESS_MESSAGES = {
  CREATED: 'Data berhasil dibuat.',
  UPDATED: 'Data berhasil diperbarui.',
  DELETED: 'Data berhasil dihapus.',
  UPLOADED: 'File berhasil diupload.',
  SENT: 'Berhasil terkirim.',
  APPROVED: 'Berhasil disetujui.',
  REJECTED: 'Berhasil ditolak.',
  VERIFIED: 'Berhasil diverifikasi.',
} as const;

// ==================== BUSINESS LOGIC ====================

export const BUSINESS = {
  /** Minimum worker count */
  MIN_WORKER_COUNT: 1,
  /** Maximum worker count */
  MAX_WORKER_COUNT: 999,
  /** Working hours format */
  WORKING_HOURS_FORMAT: 'HH:mm - HH:mm',
  /** Document number max length */
  DOCUMENT_NUMBER_MAX_LENGTH: 100,
  /** Job description max length */
  JOB_DESCRIPTION_MAX_LENGTH: 1000,
} as const;

// ==================== UI CONSTANTS ====================

export const UI = {
  /** Toast notification duration (milliseconds) */
  TOAST_DURATION: 5000,
  /** Debounce delay for search inputs (milliseconds) */
  SEARCH_DEBOUNCE: 300,
  /** Modal animation duration (milliseconds) */
  MODAL_ANIMATION: 200,
  /** Skeleton loading items per page */
  SKELETON_ITEMS: 5,
} as const;

// ==================== EXPORT ALL ====================

export const CONSTANTS = {
  PAGINATION,
  FILE_UPLOAD,
  SESSION,
  RATE_LIMIT,
  CACHE,
  QR_CODE,
  SIMLOK,
  NOTIFICATION,
  DATABASE,
  VALIDATION,
  DATE_TIME,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  BUSINESS,
  UI,
} as const;

export default CONSTANTS;
