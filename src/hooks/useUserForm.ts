/**
 * useUserForm Hook
 * Centralized user form logic with validation and submission
 * 
 * Consolidates duplicate logic from:
 * - CreateUserModal.tsx
 * - EditUserModal.tsx  
 * - ReviewerEditUserModal.tsx
 * 
 * Features:
 * - Form state management
 * - Field validation (email, phone, role-based)
 * - Error handling
 * - Loading states
 * - Submit handler
 * 
 * @example
 * const userForm = useUserForm({
 *   mode: 'create',
 *   onSuccess: (user) => console.log('Created:', user),
 *   roleRestriction: null // or 'VENDOR'
 * });
 * 
 * // In component:
 * <form onSubmit={userForm.handleSubmit}>
 *   <input 
 *     name="email" 
 *     value={userForm.formData.email}
 *     onChange={userForm.handleChange}
 *   />
 *   {userForm.errors.email && <span>{userForm.errors.email}</span>}
 * </form>
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { UserData } from '@/types/user';
import { normalizePhoneNumber, validatePhoneNumberWithMessage } from '@/lib/validators';

// ==================== TYPES ====================

export type UserFormMode = 'create' | 'edit';
export type UserRole = 'VENDOR' | 'VERIFIER' | 'REVIEWER' | 'APPROVER' | 'VISITOR' | 'SUPER_ADMIN';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface UserFormData {
  officer_name: string;
  vendor_name: string;
  email: string;
  phone_number: string;
  address: string;
  role: UserRole;
  password: string;
  isActive?: boolean;
  verification_status?: VerificationStatus;
}

export interface UseUserFormOptions {
  /** Form mode: create or edit */
  mode: UserFormMode;
  
  /** Initial data for edit mode */
  initialData?: Partial<UserFormData>;
  
  /** User ID for edit mode - required when mode is 'edit' */
  userId?: string | undefined;
  
  /** Restrict role selection (e.g., Reviewer can only edit VENDOR) */
  roleRestriction?: UserRole | null;
  
  /** Callback on successful submission */
  onSuccess?: (user: UserData) => void;
  
  /** Callback on error */
  onError?: (error: string) => void;
  
  /** Custom validation function */
  customValidation?: (formData: UserFormData) => Record<string, string>;
}

export interface UseUserFormReturn {
  /** Form data */
  formData: UserFormData;
  
  /** Validation errors */
  errors: Record<string, string>;
  
  /** Loading state */
  loading: boolean;
  
  /** Password visibility toggle */
  showPassword: boolean;
  
  /** Handle input change */
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  
  /** Toggle password visibility */
  togglePasswordVisibility: () => void;
  
  /** Validate form */
  validateForm: () => boolean;
  
  /** Handle form submission */
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  
  /** Reset form */
  reset: () => void;
  
  /** Update form data programmatically */
  setFormData: React.Dispatch<React.SetStateAction<UserFormData>>;
}

// ==================== DEFAULT VALUES ====================

const DEFAULT_FORM_DATA: UserFormData = {
  officer_name: '',
  vendor_name: '',
  email: '',
  phone_number: '',
  address: '',
  role: 'VENDOR',
  password: '',
  isActive: true,
  verification_status: 'PENDING',
};

// ==================== HOOK ====================

export function useUserForm(options: UseUserFormOptions): UseUserFormReturn {
  const {
    mode,
    initialData,
    userId,
    roleRestriction,
    onSuccess,
    onError,
    customValidation,
  } = options;

  const { showSuccess, showError } = useToast();

  // ========== STATE ==========
  const [formData, setFormData] = useState<UserFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
    // Apply role restriction if provided
    role: roleRestriction || initialData?.role || 'VENDOR',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ========== HANDLERS ==========
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // ========== VALIDATION ==========
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    // Phone validation (if provided)
    if (formData.phone_number && formData.phone_number.trim()) {
      const phoneValidation = validatePhoneNumberWithMessage(formData.phone_number.trim());
      if (!phoneValidation.isValid) {
        newErrors.phone_number = phoneValidation.error || 'Nomor telepon tidak valid';
      }
    }

    // Password validation
    if (mode === 'create') {
      // Password required for create mode
      if (!formData.password.trim()) {
        newErrors.password = 'Password wajib diisi';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password harus minimal 6 karakter';
      }
    } else {
      // Password optional for edit mode, but must be valid if provided
      if (formData.password.trim() && formData.password.length < 6) {
        newErrors.password = 'Password harus minimal 6 karakter';
      }
    }

    // Role-based validation
    if (formData.role === 'VENDOR') {
      if (!formData.vendor_name.trim()) {
        newErrors.vendor_name = 'Nama vendor wajib diisi untuk role vendor';
      }
    } else {
      if (!formData.officer_name.trim()) {
        newErrors.officer_name = 'Nama petugas wajib diisi';
      }
    }

    // Custom validation
    if (customValidation) {
      const customErrors = customValidation(formData);
      Object.assign(newErrors, customErrors);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, mode, customValidation]);

  // ========== SUBMISSION ==========
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showError('Error', 'Mohon periksa kembali data yang diisi');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare data for submission
      const dataToSend: any = {
        email: formData.email.trim(),
        phone_number: formData.phone_number.trim() 
          ? normalizePhoneNumber(formData.phone_number.trim()) 
          : null,
        address: formData.address.trim(),
        role: formData.role,
        // Clean up data based on role
        vendor_name: formData.role === 'VENDOR' ? formData.vendor_name.trim() : null,
        officer_name: formData.officer_name.trim(),
      };

      // Include optional fields for edit mode
      if (mode === 'edit') {
        dataToSend.isActive = formData.isActive;
        dataToSend.verification_status = formData.verification_status;
      }

      // Include password only if provided (or required for create)
      if (mode === 'create' || formData.password.trim()) {
        dataToSend.password = formData.password.trim();
      }

      // API endpoint based on mode
      const endpoint = mode === 'create' 
        ? '/api/users' 
        : `/api/users/${userId}`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';

      // Validate userId for edit mode
      if (mode === 'edit' && !userId) {
        throw new Error('User ID is required for edit mode');
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Gagal menyimpan data user');
      }

      const result = await response.json();
      
      const successMessage = mode === 'create' 
        ? 'User berhasil dibuat' 
        : 'Data user berhasil diperbarui';
      
      showSuccess('Berhasil', successMessage);
      
      // Call success callback
      onSuccess?.(result.user);
      
      // Reset form for create mode
      if (mode === 'create') {
        setFormData(DEFAULT_FORM_DATA);
        setErrors({});
      }
      
    } catch (error: any) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} user:`, error);
      const errorMessage = error.message || 'Gagal menyimpan data user';
      showError('Error', errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    formData, 
    mode, 
    userId, 
    validateForm, 
    onSuccess, 
    onError, 
    showSuccess, 
    showError
  ]);

  // ========== RESET ==========
  const reset = useCallback(() => {
    setFormData({
      ...DEFAULT_FORM_DATA,
      ...initialData,
      role: roleRestriction || initialData?.role || 'VENDOR',
    });
    setErrors({});
    setLoading(false);
    setShowPassword(false);
  }, [initialData, roleRestriction]);

  // ========== RETURN ==========
  return {
    formData,
    errors,
    loading,
    showPassword,
    handleChange,
    togglePasswordVisibility,
    validateForm,
    handleSubmit,
    reset,
    setFormData,
  };
}
