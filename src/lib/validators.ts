/**
 * Validation Utilities
 * Reusable validation functions for common patterns
 * Provides consistent validation across the application
 */

import { VALIDATION } from '@/config/constants';
import {
  InvalidEmailError,
  InvalidPhoneError,
  PasswordTooShortError,
  ValidationError,
} from './errors';

// ==================== EMAIL VALIDATION ====================

/**
 * Validate email format
 * @throws {InvalidEmailError} if email is invalid
 */
export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new InvalidEmailError('Email is required');
  }

  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    throw new InvalidEmailError('Email cannot be empty');
  }

  if (trimmedEmail.length > VALIDATION.EMAIL_MAX_LENGTH) {
    throw new InvalidEmailError(`Email maksimal ${VALIDATION.EMAIL_MAX_LENGTH} karakter`);
  }

  if (!VALIDATION.EMAIL_PATTERN.test(trimmedEmail)) {
    throw new InvalidEmailError();
  }
}

/**
 * Check if email is valid (returns boolean)
 */
export function isValidEmail(email: string): boolean {
  try {
    validateEmail(email);
    return true;
  } catch {
    return false;
  }
}

// ==================== PHONE VALIDATION ====================

/**
 * Normalize Indonesian phone number
 * Converts: +62xxx, 62xxx, 0xxx -> 62xxx
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  let normalized = phone.trim().replace(/\s+/g, '');
  
  // Remove + prefix
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1);
  }
  
  // Convert 0xxx to 62xxx
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  }
  
  // Ensure starts with 62
  if (!normalized.startsWith('62')) {
    normalized = '62' + normalized;
  }
  
  return normalized;
}

/**
 * Validate Indonesian phone number
 * @throws {InvalidPhoneError} if phone is invalid
 */
export function validatePhoneNumber(phone: string): void {
  if (!phone || typeof phone !== 'string') {
    throw new InvalidPhoneError('Nomor telepon is required');
  }

  const normalized = normalizePhoneNumber(phone);
  
  if (!VALIDATION.PHONE_PATTERN.test(normalized)) {
    throw new InvalidPhoneError('Format: +62xxx, 62xxx, atau 0xxx (9-12 digit)');
  }
}

/**
 * Check if phone number is valid (returns boolean)
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  try {
    validatePhoneNumber(phoneNumber);
    return true;
  } catch {
    return false;
  }
}

/**
 * Interface for detailed phone validation result
 */
export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate phone number with detailed error message
 * @param phoneNumber - Phone number to validate
 * @returns Object with validation status and error message if invalid
 */
export function validatePhoneNumberWithMessage(
  phoneNumber: string | null | undefined
): PhoneValidationResult {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return {
      isValid: false,
      error: 'Nomor telepon wajib diisi',
    };
  }

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Check if only non-digit characters
  if (!cleaned) {
    return {
      isValid: false,
      error: 'Nomor telepon harus berisi angka',
    };
  }

  // Normalize to get number without prefix
  let number = cleaned;
  
  if (number.startsWith('62')) {
    number = number.substring(2);
  } else if (number.startsWith('0')) {
    number = number.substring(1);
  }

  // Check minimum length
  if (number.length < 9) {
    return {
      isValid: false,
      error: 'Nomor telepon minimal 9 digit',
    };
  }

  // Check maximum length
  if (number.length > 13) {
    return {
      isValid: false,
      error: 'Nomor telepon maksimal 13 digit',
    };
  }

  // Check if starts with 8 (Indonesian mobile number)
  if (!number.startsWith('8')) {
    return {
      isValid: false,
      error: 'Nomor telepon Indonesia harus dimulai dengan 8',
    };
  }

  return { isValid: true };
}

// ==================== PASSWORD VALIDATION ====================

/**
 * Validate password strength
 * @throws {PasswordTooShortError | ValidationError} if password is invalid
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required');
  }

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    throw new PasswordTooShortError();
  }

  if (password.length > VALIDATION.PASSWORD_MAX_LENGTH) {
    throw new ValidationError(`Password maksimal ${VALIDATION.PASSWORD_MAX_LENGTH} karakter`);
  }
}

/**
 * Check if password is valid (returns boolean)
 */
export function isValidPassword(password: string): boolean {
  try {
    validatePassword(password);
    return true;
  } catch {
    return false;
  }
}

// ==================== NAME VALIDATION ====================

/**
 * Validate name (officer name, vendor name, etc.)
 * @throws {ValidationError} if name is invalid
 */
export function validateName(name: string, fieldName: string = 'Nama'): void {
  if (!name || typeof name !== 'string') {
    throw new ValidationError(`${fieldName} is required`);
  }

  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }

  if (trimmedName.length > VALIDATION.NAME_MAX_LENGTH) {
    throw new ValidationError(`${fieldName} maksimal ${VALIDATION.NAME_MAX_LENGTH} karakter`);
  }

  // Check for invalid characters (basic check)
  if (!/^[a-zA-Z0-9\s.,'-]+$/.test(trimmedName)) {
    throw new ValidationError(`${fieldName} contains invalid characters`);
  }
}

/**
 * Check if name is valid (returns boolean)
 */
export function isValidName(name: string): boolean {
  try {
    validateName(name);
    return true;
  } catch {
    return false;
  }
}

// ==================== DOCUMENT NUMBER VALIDATION ====================

/**
 * Normalize document number
 * - Convert to uppercase
 * - Remove "No." or "No" prefix at the beginning
 * - Trim whitespace
 */
export function normalizeDocumentNumber(docNumber: string | null | undefined): string | null {
  if (!docNumber || typeof docNumber !== 'string') {
    return null;
  }

  let normalized = docNumber.trim();
  
  // Remove "No." or "No" prefix
  normalized = normalized.replace(/^no\.?\s*/i, '');
  
  // Convert to uppercase
  normalized = normalized.toUpperCase();
  
  return normalized || null;
}

/**
 * Validate document number format
 * @throws {ValidationError} if document number is invalid
 */
export function validateDocumentNumber(docNumber: string, docType: string = 'Document'): void {
  if (!docNumber || typeof docNumber !== 'string') {
    throw new ValidationError(`${docType} number is required`);
  }

  const normalized = normalizeDocumentNumber(docNumber);
  
  if (!normalized || normalized.length === 0) {
    throw new ValidationError(`${docType} number cannot be empty`);
  }

  if (normalized.length > 100) {
    throw new ValidationError(`${docType} number too long (max 100 characters)`);
  }
}

/**
 * Check if document number is valid (returns boolean)
 */
export function isValidDocumentNumber(docNumber: string): boolean {
  try {
    validateDocumentNumber(docNumber);
    return true;
  } catch {
    return false;
  }
}

// ==================== DATE VALIDATION ====================

/**
 * Validate date string or Date object
 * @throws {ValidationError} if date is invalid
 */
export function validateDate(date: string | Date | null | undefined, fieldName: string = 'Date'): void {
  if (!date) {
    throw new ValidationError(`${fieldName} is required`);
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    throw new ValidationError(`${fieldName} is not a valid date`);
  }
}

/**
 * Check if date is valid (returns boolean)
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
  try {
    validateDate(date);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date range (start date must be before end date)
 * @throws {ValidationError} if date range is invalid
 */
export function validateDateRange(
  startDate: string | Date,
  endDate: string | Date,
  startFieldName: string = 'Start date',
  endFieldName: string = 'End date'
): void {
  validateDate(startDate, startFieldName);
  validateDate(endDate, endFieldName);

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (start > end) {
    throw new ValidationError(`${startFieldName} must be before ${endFieldName}`);
  }
}

/**
 * Check if date range is valid (returns boolean)
 */
export function isValidDateRange(startDate: string | Date, endDate: string | Date): boolean {
  try {
    validateDateRange(startDate, endDate);
    return true;
  } catch {
    return false;
  }
}

// ==================== NUMBER VALIDATION ====================

/**
 * Validate integer within range
 * @throws {ValidationError} if number is invalid
 */
export function validateInteger(
  value: number | string,
  fieldName: string,
  min?: number,
  max?: number
): void {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }

  if (!Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }

  if (min !== undefined && num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`);
  }
}

/**
 * Check if integer is valid (returns boolean)
 */
export function isValidInteger(value: number | string, min?: number, max?: number): boolean {
  try {
    validateInteger(value, 'Value', min, max);
    return true;
  } catch {
    return false;
  }
}

// ==================== STRING LENGTH VALIDATION ====================

/**
 * Validate string length
 * @throws {ValidationError} if string length is invalid
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength?: number,
  maxLength?: number
): void {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (minLength !== undefined && trimmed.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
  }

  if (maxLength !== undefined && trimmed.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters`);
  }
}

/**
 * Check if string length is valid (returns boolean)
 */
export function isValidStringLength(value: string, minLength?: number, maxLength?: number): boolean {
  try {
    validateStringLength(value, 'Value', minLength, maxLength);
    return true;
  } catch {
    return false;
  }
}

// ==================== UUID VALIDATION ====================

/**
 * Validate UUID format
 * @throws {ValidationError} if UUID is invalid
 */
export function validateUUID(uuid: string, fieldName: string = 'ID'): void {
  if (!uuid || typeof uuid !== 'string') {
    throw new ValidationError(`${fieldName} is required`);
  }

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidPattern.test(uuid)) {
    throw new ValidationError(`${fieldName} is not a valid UUID`);
  }
}

/**
 * Check if UUID is valid (returns boolean)
 */
export function isValidUUID(uuid: string): boolean {
  try {
    validateUUID(uuid);
    return true;
  } catch {
    return false;
  }
}

// ==================== ENUM VALIDATION ====================

/**
 * Validate value is in enum
 * @throws {ValidationError} if value is not in enum
 */
export function validateEnum<T extends string>(
  value: string,
  enumObj: Record<string, T>,
  fieldName: string = 'Value'
): void {
  const validValues = Object.values(enumObj);
  
  if (!validValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${validValues.join(', ')}`
    );
  }
}

/**
 * Check if value is in enum (returns boolean)
 */
export function isValidEnum<T extends string>(value: string, enumObj: Record<string, T>): boolean {
  try {
    validateEnum(value, enumObj);
    return true;
  } catch {
    return false;
  }
}

// ==================== EXPORTS ====================

export default {
  // Email
  validateEmail,
  isValidEmail,
  
  // Phone
  normalizePhoneNumber,
  validatePhoneNumber,
  isValidPhoneNumber,
  
  // Password
  validatePassword,
  isValidPassword,
  
  // Name
  validateName,
  isValidName,
  
  // Document Number
  normalizeDocumentNumber,
  validateDocumentNumber,
  isValidDocumentNumber,
  
  // Date
  validateDate,
  isValidDate,
  validateDateRange,
  isValidDateRange,
  
  // Number
  validateInteger,
  isValidInteger,
  
  // String Length
  validateStringLength,
  isValidStringLength,
  
  // UUID
  validateUUID,
  isValidUUID,
  
  // Enum
  validateEnum,
  isValidEnum,
};
