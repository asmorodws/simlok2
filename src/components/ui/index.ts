/**
 * UI Components Index
 * 
 * Central export point for all reusable UI components.
 * Import components from this file to maintain consistent imports across the app.
 * 
 * @example
 * ```tsx
 * import { Button, Input, Modal, Table } from '@/components/ui';
 * ```
 */

// Base components
export { Button, buttonVariants } from './Button';
export type { ButtonProps } from './Button';

export { Input, inputVariants } from './Input';
export type { InputProps } from './Input';

export { Modal, modalVariants, modalContentVariants } from './Modal';
export type { ModalProps } from './Modal';

export { Table, tableVariants } from './Table';
export type { TableProps, Column } from './Table';

export { Toast, ToastContainer, toastVariants, useToast } from './Toast';
export type { ToastProps, ToastItem } from './Toast';

export { Form, FormField, FormGroup, FormRow, formFieldVariants } from './Form';
export type { FormProps, FormFieldProps } from './Form';
