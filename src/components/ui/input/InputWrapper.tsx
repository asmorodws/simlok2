import React from 'react';

interface InputWrapperProps {
  children: React.ReactNode;
  error?: string | undefined;
  className?: string;
}

/**
 * InputWrapper - Shared wrapper for all input components
 * Provides consistent error message display
 */
export default function InputWrapper({ children, error, className = '' }: InputWrapperProps) {
  return (
    <div className={className}>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * getInputClasses - Shared utility for input styling
 * Generates consistent className strings for input fields
 */
export function getInputClasses(error?: string, additionalClasses: string = ''): string {
  const baseClasses = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1';
  const errorClasses = error
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
  
  return `${baseClasses} ${errorClasses} ${additionalClasses}`.trim();
}

/**
 * getTextareaClasses - Shared utility for textarea styling
 */
export function getTextareaClasses(error?: string, additionalClasses: string = ''): string {
  const baseClasses = 'flex min-h-[100px] w-full rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50';
  const errorClasses = error
    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
  
  return `${baseClasses} ${errorClasses} ${additionalClasses}`.trim();
}
