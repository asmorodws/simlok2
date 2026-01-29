/**
 * Application-wide constants
 * Centralized configuration values for maintainability
 */

// ============================================
// PAGINATION CONSTANTS
// ============================================

export const PAGINATION = {
  /** Default page size for lists */
  DEFAULT_LIMIT: 20,
  
  /** Maximum page size allowed */
  MAX_LIMIT: 100,
  
  /** Default page number */
  DEFAULT_PAGE: 1,
  
  /** Dashboard recent submissions limit */
  DASHBOARD_RECENT_LIMIT: 10,
  
  /** Dashboard stats top items limit */
  DASHBOARD_STATS_TOP_LIMIT: 5,
} as const;

// ============================================
// TIMEOUT CONSTANTS (milliseconds)
// ============================================

export const TIMEOUTS = {
  /** Debounce delay for search/filter inputs */
  DEBOUNCE: 300,
  
  /** Toast auto-dismiss delay */
  TOAST: 3000,
  
  /** Loading state minimum display time */
  MIN_LOADING: 500,
  
  /** File upload progress reset delay */
  UPLOAD_PROGRESS_RESET: 800,
  
  /** Session refresh interval (15 minutes) */
  SESSION_REFRESH: 15 * 60 * 1000,
  
  /** Server time sync interval (1 hour) */
  SERVER_TIME_SYNC: 60 * 60 * 1000,
} as const;

// ============================================
// FILE UPLOAD CONSTANTS
// ============================================

export const FILE_UPLOAD = {
  /** Maximum file size in bytes (10MB) */
  MAX_SIZE: 10 * 1024 * 1024,
  
  /** Maximum file size in bytes (5MB for images) */
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,
  
  /** Allowed file types for documents */
  ALLOWED_DOCUMENT_TYPES: ['application/pdf'] as const,
  
  /** Allowed file types for images */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,
  
  /** Compression quality for images (0-1) */
  IMAGE_COMPRESSION_QUALITY: 0.8,
  
  /** Maximum image dimension (width/height) */
  MAX_IMAGE_DIMENSION: 1920,
} as const;

// ============================================
// VALIDATION CONSTANTS
// ============================================

export const VALIDATION = {
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  
  /** Maximum password length */
  MAX_PASSWORD_LENGTH: 100,
  
  /** Minimum phone number length */
  MIN_PHONE_LENGTH: 9,
  
  /** Maximum phone number length */
  MAX_PHONE_LENGTH: 13,
  
  /** Minimum worker name length */
  MIN_WORKER_NAME_LENGTH: 3,
  
  /** Maximum worker name length */
  MAX_WORKER_NAME_LENGTH: 100,
  
  /** SIMLOK number format regex */
  SIMLOK_NUMBER_REGEX: /^\d{4}\/SIMLOK\/SEC\/\d{2}\/\d{4}$/,
} as const;

// ============================================
// RATE LIMITING CONSTANTS
// ============================================

export const RATE_LIMIT = {
  /** API requests per minute */
  REQUESTS_PER_MINUTE: 60,
  
  /** Login attempts before lockout */
  MAX_LOGIN_ATTEMPTS: 5,
  
  /** Login lockout duration (minutes) */
  LOGIN_LOCKOUT_DURATION: 15,
  
  /** File upload rate limit per minute */
  FILE_UPLOAD_LIMIT: 10,
} as const;

// ============================================
// CACHE CONSTANTS
// ============================================

export const CACHE = {
  /** Cache TTL for dashboard stats (5 minutes) */
  DASHBOARD_STATS_TTL: 5 * 60,
  
  /** Cache TTL for user session (30 minutes) */
  SESSION_TTL: 30 * 60,
  
  /** Cache TTL for notifications (1 minute) */
  NOTIFICATIONS_TTL: 60,
  
  /** Cache TTL for submission list (2 minutes) */
  SUBMISSIONS_TTL: 2 * 60,
} as const;

// ============================================
// UI CONSTANTS
// ============================================

export const UI = {
  /** Toast z-index */
  TOAST_Z_INDEX: 9999,
  
  /** Modal z-index */
  MODAL_Z_INDEX: 1000,
  
  /** Dropdown z-index */
  DROPDOWN_Z_INDEX: 999,
  
  /** Mobile breakpoint (px) */
  MOBILE_BREAKPOINT: 768,
  
  /** Tablet breakpoint (px) */
  TABLET_BREAKPOINT: 1024,
  
  /** Desktop breakpoint (px) */
  DESKTOP_BREAKPOINT: 1280,
} as const;

// ============================================
// SUBMISSION CONSTANTS
// ============================================

export const SUBMISSION = {
  /** Maximum workers per submission */
  MAX_WORKERS: 100,
  
  /** Maximum support documents */
  MAX_SUPPORT_DOCUMENTS: 20,
  
  /** QR code expiry days */
  QR_CODE_EXPIRY_DAYS: 365,
  
  /** SIMLOK validity period (days) */
  SIMLOK_VALIDITY_DAYS: 365,
} as const;

// ============================================
// DATE FORMAT CONSTANTS
// ============================================

export const DATE_FORMAT = {
  /** ISO date format (YYYY-MM-DD) */
  ISO: 'YYYY-MM-DD',
  
  /** Indonesian date format */
  INDONESIAN: 'DD MMMM YYYY',
  
  /** Short date format */
  SHORT: 'DD/MM/YYYY',
  
  /** Date with time format */
  WITH_TIME: 'DD MMMM YYYY HH:mm',
  
  /** Time only format */
  TIME_ONLY: 'HH:mm:ss',
} as const;

// ============================================
// ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Email atau password salah',
  SESSION_EXPIRED: 'Sesi Anda telah berakhir. Silakan login kembali',
  UNAUTHORIZED: 'Anda tidak memiliki akses untuk resource ini',
  
  // Validation
  REQUIRED_FIELD: 'Field ini wajib diisi',
  INVALID_EMAIL: 'Format email tidak valid',
  INVALID_PHONE: 'Format nomor telepon tidak valid',
  PASSWORD_TOO_SHORT: `Password minimal ${VALIDATION.MIN_PASSWORD_LENGTH} karakter`,
  
  // File Upload
  FILE_TOO_LARGE: `Ukuran file maksimal ${FILE_UPLOAD.MAX_SIZE / 1024 / 1024}MB`,
  INVALID_FILE_TYPE: 'Tipe file tidak didukung',
  
  // Network
  NETWORK_ERROR: 'Gagal terhubung ke server. Periksa koneksi internet Anda',
  SERVER_ERROR: 'Terjadi kesalahan pada server. Silakan coba lagi',
  TIMEOUT_ERROR: 'Request timeout. Silakan coba lagi',
  
  // Generic
  UNKNOWN_ERROR: 'Terjadi kesalahan yang tidak diketahui',
  NOT_FOUND: 'Data tidak ditemukan',
  FORBIDDEN: 'Akses ditolak',
} as const;

// ============================================
// SUCCESS MESSAGES
// ============================================

export const SUCCESS_MESSAGES = {
  // Submission
  SUBMISSION_CREATED: 'Pengajuan berhasil dibuat',
  SUBMISSION_UPDATED: 'Pengajuan berhasil diperbarui',
  SUBMISSION_DELETED: 'Pengajuan berhasil dihapus',
  SUBMISSION_APPROVED: 'Pengajuan berhasil disetujui',
  SUBMISSION_REJECTED: 'Pengajuan berhasil ditolak',
  
  // User
  USER_CREATED: 'User berhasil dibuat',
  USER_UPDATED: 'User berhasil diperbarui',
  USER_DELETED: 'User berhasil dihapus',
  USER_VERIFIED: 'User berhasil diverifikasi',
  
  // File
  FILE_UPLOADED: 'File berhasil diunggah',
  FILE_DELETED: 'File berhasil dihapus',
  
  // Generic
  SAVE_SUCCESS: 'Data berhasil disimpan',
  DELETE_SUCCESS: 'Data berhasil dihapus',
  UPDATE_SUCCESS: 'Data berhasil diperbarui',
} as const;

// ============================================
// HTTP STATUS CODES
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// API ROUTES
// ============================================

export const API_ROUTES = {
  // Auth
  LOGIN: '/api/auth/signin',
  LOGOUT: '/api/auth/signout',
  SIGNUP: '/api/auth/signup',
  
  // Submissions
  SUBMISSIONS: '/api/submissions',
  SUBMISSION_DETAIL: (id: string) => `/api/submissions/${id}`,
  
  // Users
  USERS: '/api/users',
  USER_DETAIL: (id: string) => `/api/users/${id}`,
  
  // QR
  QR_VERIFY: '/api/qr/verify',
  SCAN_HISTORY: '/api/scan-history',
  
  // Dashboard
  DASHBOARD_STATS: '/api/dashboard/stats',
  RECENT_SUBMISSIONS: '/api/dashboard/recent-submissions',
  
  // Notifications
  NOTIFICATIONS: '/api/v1/notifications',
  MARK_READ: '/api/v1/notifications/mark-read',
  
  // Server
  SERVER_TIME: '/api/server-time',
} as const;

// ============================================
// LOCAL STORAGE KEYS
// ============================================

export const STORAGE_KEYS = {
  /** Draft submission form data */
  SUBMISSION_DRAFT: 'simlok:submissionFormDraft.v1',
  
  /** User preferences */
  USER_PREFERENCES: 'simlok:userPreferences',
  
  /** Theme preference */
  THEME: 'simlok:theme',
  
  /** Last notification check */
  LAST_NOTIFICATION_CHECK: 'simlok:lastNotificationCheck',
  
  /** Server time offset */
  SERVER_TIME_OFFSET: 'simlok:serverTimeOffset',
} as const;

// ============================================
// TYPE EXPORTS FOR TYPE SAFETY
// ============================================

export type TimeoutKey = keyof typeof TIMEOUTS;
export type FileUploadKey = keyof typeof FILE_UPLOAD;
export type ValidationKey = keyof typeof VALIDATION;
export type RateLimitKey = keyof typeof RATE_LIMIT;
export type CacheKey = keyof typeof CACHE;
export type UIKey = keyof typeof UI;
export type SubmissionKey = keyof typeof SUBMISSION;
export type DateFormatKey = keyof typeof DATE_FORMAT;
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
export type SuccessMessageKey = keyof typeof SUCCESS_MESSAGES;
export type HttpStatusKey = keyof typeof HTTP_STATUS;
