/**
 * Input Sanitization Utilities
 * Provides functions to sanitize user input and prevent security vulnerabilities
 * Includes XSS prevention, SQL injection protection, and safe string handling
 */

// ==================== HTML/XSS SANITIZATION ====================

/**
 * Escape HTML special characters to prevent XSS attacks
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return '';
  }

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return unsafe.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Remove all HTML tags from string
 */
export function stripHtml(html: string): string {
  if (typeof html !== 'string') {
    return '';
  }

  return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize string for safe HTML display
 * Combines escaping and stripping
 */
export function sanitizeHtml(input: string): string {
  return escapeHtml(stripHtml(input));
}

// ==================== STRING SANITIZATION ====================

/**
 * Trim whitespace and remove multiple spaces
 */
export function trimAndNormalize(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  return str
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
}

/**
 * Remove null bytes and control characters
 */
export function removeControlChars(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  // Remove null bytes and other control characters except newline, tab, carriage return
  return str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitize string for filename use
 * Removes or replaces characters that could be problematic in filenames
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'unnamed';
  }

  return filename
    .trim()
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    // Remove path separators
    .replace(/[/\\]/g, '_')
    // Remove other problematic characters
    .replace(/[<>:"|?*\x00-\x1F]/g, '_')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Limit length
    .substring(0, 255)
    || 'unnamed';
}

/**
 * Sanitize path to prevent directory traversal
 */
export function sanitizePath(path: string): string {
  if (typeof path !== 'string') {
    return '';
  }

  return path
    // Remove null bytes
    .replace(/\x00/g, '')
    // Remove parent directory references
    .replace(/\.\./g, '')
    // Normalize slashes
    .replace(/\\/g, '/')
    // Remove leading slashes
    .replace(/^\/+/, '')
    // Remove multiple consecutive slashes
    .replace(/\/+/g, '/');
}

// ==================== SQL INJECTION PREVENTION ====================

/**
 * Escape single quotes for SQL (for string literals)
 * NOTE: Using Prisma ORM with parameterized queries is preferred
 * This is for edge cases where dynamic SQL is unavoidable
 */
export function escapeSqlString(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  return str.replace(/'/g, "''");
}

/**
 * Sanitize input for SQL LIKE clause
 * Escapes special LIKE wildcards
 */
export function escapeSqlLike(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Validate SQL identifier (table/column name)
 * Only allows alphanumeric and underscores
 */
export function validateSqlIdentifier(identifier: string): boolean {
  if (typeof identifier !== 'string') {
    return false;
  }

  // SQL identifiers should only contain letters, numbers, and underscores
  // Must start with letter or underscore
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

// ==================== NUMBER SANITIZATION ====================

/**
 * Sanitize and parse integer
 * Returns null if invalid
 */
export function sanitizeInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Sanitize and parse float
 * Returns null if invalid
 */
export function sanitizeFloat(value: unknown): number | null {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Clamp number within range
 */
export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ==================== ARRAY SANITIZATION ====================

/**
 * Ensure value is an array and sanitize items
 */
export function sanitizeArray<T>(
  value: unknown,
  itemSanitizer?: (item: unknown) => T | null
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  if (!itemSanitizer) {
    return value as T[];
  }

  return value
    .map(itemSanitizer)
    .filter((item): item is T => item !== null);
}

// ==================== OBJECT SANITIZATION ====================

/**
 * Remove undefined values from object
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Remove null and undefined values from object
 */
export function removeNullish<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Pick only allowed keys from object
 */
export function pickKeys<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  allowedKeys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;

  for (const key of allowedKeys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Omit specific keys from object
 */
export function omitKeys<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keysToOmit: K[]
): Omit<T, K> {
  const result = { ...obj };

  for (const key of keysToOmit) {
    delete result[key];
  }

  return result;
}

// ==================== EMAIL SANITIZATION ====================

/**
 * Sanitize email address
 * Trims, converts to lowercase, removes invalid characters
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  return email
    .trim()
    .toLowerCase()
    // Remove whitespace
    .replace(/\s+/g, '')
    // Keep only valid email characters
    .replace(/[^a-z0-9@._+-]/g, '');
}

// ==================== URL SANITIZATION ====================

/**
 * Sanitize URL
 * Validates and normalizes URL, prevents javascript: and data: protocols
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim();

  // Block dangerous protocols
  const lowerUrl = trimmed.toLowerCase();
  if (
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('data:') ||
    lowerUrl.startsWith('vbscript:')
  ) {
    return null;
  }

  // Only allow http, https, and relative URLs
  if (!trimmed.match(/^(https?:\/\/|\/)/i)) {
    return null;
  }

  try {
    // Validate URL format
    new URL(trimmed, 'http://localhost');
    return trimmed;
  } catch {
    return null;
  }
}

// ==================== SEARCH QUERY SANITIZATION ====================

/**
 * Sanitize search query
 * Removes potentially dangerous characters while allowing reasonable search terms
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }

  return query
    .trim()
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove potentially dangerous special chars but keep basic punctuation
    .replace(/[<>'"]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    // Limit length to prevent DoS
    .substring(0, 200);
}

// ==================== COMMON SANITIZATION PATTERNS ====================

/**
 * Sanitize user input object
 * Applies common sanitization to all string fields
 */
export function sanitizeUserInput<T extends Record<string, any>>(input: T): T {
  const result = { ...input };

  for (const key in result) {
    const value = result[key];

    if (typeof value === 'string') {
      result[key] = removeControlChars(trimAndNormalize(value)) as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * Deep sanitize object (recursive)
 */
export function deepSanitize<T>(value: T): T {
  if (typeof value === 'string') {
    return removeControlChars(trimAndNormalize(value)) as T;
  }

  if (Array.isArray(value)) {
    return value.map(deepSanitize) as T;
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};
    
    for (const key in value) {
      result[key] = deepSanitize((value as Record<string, any>)[key]);
    }
    
    return result as T;
  }

  return value;
}

// ==================== EXPORTS ====================

export default {
  // HTML/XSS
  escapeHtml,
  stripHtml,
  sanitizeHtml,
  
  // String
  trimAndNormalize,
  removeControlChars,
  sanitizeFilename,
  sanitizePath,
  
  // SQL
  escapeSqlString,
  escapeSqlLike,
  validateSqlIdentifier,
  
  // Number
  sanitizeInteger,
  sanitizeFloat,
  clampNumber,
  
  // Array
  sanitizeArray,
  
  // Object
  removeUndefined,
  removeNullish,
  pickKeys,
  omitKeys,
  
  // Email
  sanitizeEmail,
  
  // URL
  sanitizeUrl,
  
  // Search
  sanitizeSearchQuery,
  
  // Common Patterns
  sanitizeUserInput,
  deepSanitize,
};
