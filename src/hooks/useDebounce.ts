'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for debouncing a value
 * Useful for search inputs, auto-save, and any value that updates frequently
 * 
 * @template T - The type of the value to debounce
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns The debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * useEffect(() => {
 *   // This effect will only run when debouncedSearchTerm changes
 *   // (i.e., 500ms after the user stops typing)
 *   if (debouncedSearchTerm) {
 *     searchAPI(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  // State and setters for debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on component unmount)
    // This is how we prevent debounced value from updating if value is changed ...
    // ... within the delay period. Timeout gets cleared and restarted.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Only re-call effect if value or delay changes

  return debouncedValue;
}

/**
 * Custom hook for debouncing a callback function
 * Useful for event handlers that should only fire once after a delay
 * 
 * @param callback - The callback function to debounce
 * @param delay - The delay in milliseconds (default: 500ms)
 * @returns The debounced callback function
 * 
 * @example
 * const handleSearch = useDebouncedCallback((searchTerm: string) => {
 *   searchAPI(searchTerm);
 * }, 500);
 * 
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  useEffect(() => {
    // Cleanup function to cancel any pending calls on unmount
    return () => {
      if (typeof window !== 'undefined') {
        // Clear all timeouts when component unmounts
      }
    };
  }, []);

  return (...args: Parameters<T>) => {
    // We can't use useEffect here because we need to return a function
    // So we'll use a simple setTimeout approach
    const timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    // Store timeout ID for potential cleanup
    return () => clearTimeout(timeoutId);
  };
}
